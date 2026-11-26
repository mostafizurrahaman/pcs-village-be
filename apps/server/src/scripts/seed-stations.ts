import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { Branch, DutyStation, User, AuthRoles } from '@repo/db'
import { slugify } from '@repo/shared'

// 1. Resolve and load environment variables
const envPath = [
  path.resolve(process.cwd(), '.env.development'),
  path.resolve(process.cwd(), 'apps/server/.env.development'),
  path.resolve(__dirname, '../../.env.development'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'apps/server/.env'),
  path.resolve(__dirname, '../../.env'),
].find((p) => fs.existsSync(p))

if (envPath) {
  dotenv.config({ path: envPath })
} else {
  dotenv.config()
}

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  console.error('❌ Error: DATABASE_URL is not defined in environment variables!')
  process.exit(1)
}

// 2. Resolve stations.json path
const jsonPath = [
  path.resolve(process.cwd(), 'docs/stations.json'),
  path.resolve(process.cwd(), '../../docs/stations.json'),
  path.resolve(__dirname, '../../../../docs/stations.json'),
].find((p) => fs.existsSync(p))

if (!jsonPath) {
  console.error('❌ Error: docs/stations.json file not found!')
  process.exit(1)
}

interface IRawStation {
  Branch: string
  'Installation Name': string
  City?: string
  'State/Region'?: string
  Country?: string
  'Installation Type'?: string
}

const seedStations = async () => {
  try {
    console.log(`🔌 Connecting to database...`)
    await mongoose.connect(dbUrl)
    console.log(`✅ Database connected successfully.`)

    // Load stations.json
    console.log(`📖 Reading stations from: ${jsonPath}`)
    const rawData = fs.readFileSync(jsonPath, 'utf-8')
    const stations: IRawStation[] = JSON.parse(rawData)
    console.log(`📊 Total records found in JSON: ${stations.length}`)

    // Find superadmin for suggestedBy attribute
    const superAdmin = await User.findOne({ role: AuthRoles.SUPER_ADMIN }).select('_id')

    // 1. Identify unique branches
    const uniqueBranchNames = Array.from(
      new Set(stations.map((s) => s.Branch?.trim()).filter(Boolean))
    )
    console.log(`\n🔍 Identified ${uniqueBranchNames.length} unique branches:`, uniqueBranchNames)

    // 2. Insert or get branches
    const branchMap = new Map<string, mongoose.Types.ObjectId>()
    for (const rawName of uniqueBranchNames) {
      const normalizedName = rawName.toLowerCase()
      const slug = slugify(normalizedName)

      let branch = await Branch.findOne({ slug })
      if (!branch) {
        branch = await Branch.create({
          name: normalizedName,
          slug,
        })
        console.log(`  ➕ Created Branch: "${rawName}" -> ID: ${branch._id}`)
      } else {
        console.log(`  ℹ️ Existing Branch: "${rawName}" -> ID: ${branch._id}`)
      }

      branchMap.set(normalizedName, branch._id as mongoose.Types.ObjectId)
    }

    // 3. Insert or update Duty Stations
    console.log(`\n📍 Inserting Duty Stations...`)
    let insertedCount = 0
    let updatedCount = 0

    for (const item of stations) {
      const branchKey = item.Branch?.trim().toLowerCase()
      const branchId = branchMap.get(branchKey)

      if (!branchId) {
        console.warn(`  ⚠️ Warning: No branch ID found for "${item.Branch}", skipping "${item['Installation Name']}"`)
        continue
      }

      const name = item['Installation Name']?.trim()
      const city = item.City?.trim() || item['State/Region']?.trim() || 'N/A'
      const state = item['State/Region']?.trim() || 'N/A'
      const country = item.Country?.trim() || 'USA'

      const existingStation = await DutyStation.findOne({
        name,
        branch: branchId,
      })

      if (!existingStation) {
        await DutyStation.create({
          name,
          branch: branchId,
          city,
          state,
          country,
          type: 'BASE',
          isApproved: true,
          isDeleteable: true,
          ...(superAdmin?._id && { suggestedBy: superAdmin._id }),
        })
        insertedCount++
      } else {
        await DutyStation.updateOne(
          { _id: existingStation._id },
          {
            $set: {
              city,
              state,
              country,
              type: 'BASE',
              isApproved: true,
              branch: branchId,
            },
          }
        )
        updatedCount++
      }
    }

    console.log(`\n🎉 Seeding finished successfully!`)
    console.log(`   - Total Processed: ${stations.length}`)
    console.log(`   - Newly Inserted Stations: ${insertedCount}`)
    console.log(`   - Updated Existing Stations: ${updatedCount}`)
  } catch (error) {
    console.error(`❌ Error during seeding:`, error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    console.log(`🔌 Database connection closed.`)
  }
}

seedStations()
