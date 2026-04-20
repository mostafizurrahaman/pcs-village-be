import {
  Group,
  GroupMember,
  GroupPost,
  GroupPostComment,
  GroupPostLike,
  MembershipStatus,
  UserProfile,
  type IUser,
} from 'packages/db/src'
import type {
  TCreateGroupPost,
  TGetAllGroupPostsQuery,
  TUpdateGroupPost,
} from './group-post.validation'
import { AppError } from 'packages/shared/src'
import httpStatus from 'http-status'
import {
  deleteMultipleFilesFromS3,
  deleteSingleFileFromS3,
  uploadMultipleFileToS3,
} from 'packages/media-hub/src'
import mongoose, { Types, type PipelineStage } from 'mongoose'
import { logger } from '@app/libs/logger'

// 1. create Community post :
const createGroupPost = async (
  user: IUser,
  data: TCreateGroupPost,
  files: Express.Multer.File[]
) => {
  const { content, group } = data

  // 1. Check the user and get user profile:
  const profile = await UserProfile.findOne({
    user: user?._id,
  })
  if (!profile) {
    throw new AppError(httpStatus.NOT_FOUND, 'Profile not found!')
  }

  // 2. Check is the group exists ?
  const existingGroup = await Group.findById(group)
  if (!existingGroup) {
    throw new AppError(httpStatus.NOT_FOUND, 'Group not found!')
  }

  // 3. Check group member exists ? :
  const membership = await GroupMember.findOne({
    user: user?._id,
    group: existingGroup?._id,
    status: MembershipStatus.ACTIVE,
  })

  if (!membership) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You are not active member of this group!')
  }

  //  3. Check is there any attachments:
  if (Array.isArray(files) && files.length > 5) {
    throw new AppError(httpStatus.BAD_REQUEST, `You can only upload 5 attachments!`)
  }

  const attachments = []
  if (Array.isArray(files) && files.length > 0) {
    const uploadedFiles = await uploadMultipleFileToS3(files, 'group-posts')
    attachments.push(...uploadedFiles.map((f) => f.url))
  }

  // 4. Create post now:
  const post = await GroupPost.create({
    group: existingGroup?._id,
    author: user?._id,
    content,
    attachments,
  })

  return post
}

// // 2. Delete community attachments:
const deletePostAttachment = async (user: IUser, postId: string, url: string) => {
  // 1. Check the user and get user profile:
  const existingPost = await GroupPost.findById(postId)
  if (!existingPost) {
    throw new AppError(httpStatus.NOT_FOUND, 'Post not found!')
  }

  //   2. Check is that post belogs to your account :
  if (existingPost.author?.toString() !== user?._id?.toString()) {
    throw new AppError(httpStatus.BAD_REQUEST, `This post doesn't belongs you!`)
  }

  // 3. Check is active group member?:
  const membership = await GroupMember.findOne({
    user: user?._id,
    group: existingPost?.group,
    status: MembershipStatus.ACTIVE,
  })

  if (!membership) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You are not active member of this group!')
  }

  //  3. Check is there any attachments:

  const post = await GroupPost.findOneAndUpdate(
    {
      _id: existingPost?._id,
    },
    {
      $pull: {
        attachments: url,
      },
    }
  )

  // 4. delete from aws also :
  await deleteSingleFileFromS3(url)

  return post
}

// // 3. Update Community post :
const MAX_ATTACHMENTS = 5

const updateGroupPost = async (
  user: IUser,
  data: TUpdateGroupPost,
  files: Express.Multer.File[],
  postId: string
) => {
  const { content } = data

  // 1. Check post
  const existingPost = await GroupPost.findOne({
    _id: postId,
    author: user?._id,
  })
  if (!existingPost) {
    throw new AppError(httpStatus.NOT_FOUND, `Post doesn't exist!`)
  }

  // 2. Check the user is active member of this group?:
  const membership = await GroupMember.findOne({
    user: user?._id,
    group: existingPost?.group,
    status: MembershipStatus.ACTIVE,
  })

  if (!membership) {
    throw new AppError(httpStatus.BAD_REQUEST, `You aren't an active member of this group!`)
  }

  // 4. Attachment validation
  const existingAttachments = existingPost.attachments || []
  if (files.length + existingAttachments.length > MAX_ATTACHMENTS) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `You can upload up to ${MAX_ATTACHMENTS} attachments!`
    )
  }

  // 5. Upload new files (if any)
  let newAttachments: string[] = []

  if (files.length > 0) {
    const uploadedFiles = await uploadMultipleFileToS3(files, 'communityPosts')
    newAttachments = uploadedFiles.map((f) => f.url)
  }

  // 6. Update fields
  existingPost.content = content ?? existingPost.content

  if (files.length > 0) {
    existingPost.attachments = [...existingAttachments, ...newAttachments]
  }

  await existingPost.save()

  return existingPost
}

// // 4. Get post by id:
const getPostById = async (postId: string) => {
  const pipeline: PipelineStage[] = []

  pipeline.push({
    $match: {
      _id: postId,
    },
  })

  const post = await GroupPost.aggregate(pipeline)

  if (!post) {
    throw new AppError(httpStatus.NOT_FOUND, `Post not found!`)
  }

  return post
}

// // 5. delete post by id:
// const deletePostById = async (user: IUser, postId: string) => {
//   const session = await mongoose.startSession()

//   try {
//     session.startTransaction()

//     // 1. Check if post exists
//     const existingPost = await CommunityPost.findById(postId).session(session)

//     if (!existingPost) {
//       throw new AppError(httpStatus.NOT_FOUND, `Post not found!`)
//     }

//     // 2. Authorization check
//     if (existingPost.author?.toString() !== user?._id?.toString()) {
//       throw new AppError(httpStatus.FORBIDDEN, `You are not allowed to delete this post.`)
//     }

//     // 3. COLLECT ALL COMMENT ATTACHMENTS BEFORE DELETING FROM DB
//     // Fetch only the attachments field from all comments related to this post
//     const commentsWithFiles = await CommunityComment.find(
//       { post: postId, attachments: { $exists: true, $not: { $size: 0 } } },
//       { attachments: 1 }
//     ).session(session)

//     // Flatten the array of arrays into a single list of S3 URLs/Keys
//     const allCommentAttachments = commentsWithFiles.reduce((acc, curr) => {
//       return [...acc, ...(curr.attachments || [])]
//     }, [] as string[])

//     // 4. Delete related comments from Database
//     await CommunityComment.deleteMany({ post: postId }, { session })

//     // 5. Delete related likes from Database
//     await PostLike.deleteMany({ post: postId }, { session })

//     // 6. Delete the Post itself from Database
//     const deletedPost = await CommunityPost.findByIdAndDelete(postId, { session })

//     // 7. Commit DB changes
//     await session.commitTransaction()
//     session.endSession()

//     // 8. CLEANUP S3 (External Service)
//     // Combine post attachments and comment attachments for a single S3 cleanup call
//     const filesToDelete = [...(existingPost.attachments || []), ...allCommentAttachments]

//     if (filesToDelete.length > 0) {
//       // It's better to filter for unique values if a file might be referenced twice
//       const uniqueFiles = [...new Set(filesToDelete)]
//       logger.info('uniqueFiles', uniqueFiles)
//       await deleteMultipleFilesFromS3(uniqueFiles)
//     }

//     return deletedPost
//   } catch (error) {
//     await session.abortTransaction()
//     session.endSession()
//     throw error
//   }
// }

// // 6. Get all post relevant to me in my community:
const getUserGroupPostsByUserId = async (user: IUser, query: TGetAllGroupPostsQuery) => {
  const {
    group: groupId,
    fromDate,
    toDate,
    searchTerm,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    limit = 10,
    page = 1,
  } = query

  const dataLimit = Number(limit)
  const skip = (Number(page) - 1) * dataLimit

  // 1. Check the user and get user profile:
  const profile = await UserProfile.findOne({
    user: user?._id,
  })
  if (!profile) {
    throw new AppError(httpStatus.NOT_FOUND, 'Profile not found!')
  }

  // 2. Check is this group exists ?:
  const group = await Group.findById(groupId)
  if (!group) {
    throw new AppError(httpStatus.NOT_FOUND, `Group doesn't exists!`)
  }

  // 3. Check is the user member of this group? :
  const membership = await GroupMember.findOne({
    group: group?._id,
    user: user?._id,
  })

  if (!membership || membership?.status === 'LEFT') {
    throw new AppError(httpStatus.BAD_REQUEST, `You don't have access in this group!`)
  }

  const pipeline: PipelineStage[] = []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchingStage: PipelineStage = {
    $match: {
      group: group?._id,
    },
  }

  if (membership?.status === MembershipStatus.ACTIVE) {
    pipeline.push({
      $match: {
        createdAt: {
          $gte: new Date(membership.joinedAt),
        },
      },
    })
  }

  if (membership?.status === MembershipStatus.ARCHIVED) {
    pipeline.push({
      $match: {
        createdAt: {
          $gte: new Date(membership.joinedAt),
          $lte: new Date(membership.archivedAt as Date),
        },
      },
    })
  }

  if (fromDate || toDate) {
    const dateFilter: Record<string, Date> = {}
    if (fromDate) {
      dateFilter.$gte = new Date(fromDate)
    }
    if (toDate) {
      dateFilter.$lte = new Date(toDate)
    }
    matchingStage.$match.createdAt = dateFilter
  }

  pipeline.push(matchingStage)

  // prepare station lookup :
  pipeline.push({
    $lookup: {
      from: 'groups',
      localField: 'group',
      foreignField: '_id',
      as: 'group',
    },
  })

  pipeline.push({
    $unwind: {
      path: '$group',
      preserveNullAndEmptyArrays: true,
    },
  })

  pipeline.push({
    $addFields: {
      isAuthor: {
        $eq: ['$author', new Types.ObjectId(user._id)],
      },
    },
  })

  // prepare author lookup :
  pipeline.push({
    $lookup: {
      from: 'users',
      localField: 'author',
      foreignField: '_id',
      as: 'author',
      pipeline: [
        {
          $lookup: {
            from: 'userprofiles',
            let: {
              userId: '$_id',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$$userId', '$user'],
                  },
                },
              },
            ],
            as: 'profile',
          },
        },
        {
          $unwind: {
            path: '$profile',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            password: 0,
            twoFactorBackupCodes: 0,
          },
        },
      ],
    },
  })

  pipeline.push({
    $unwind: {
      path: '$author',
      preserveNullAndEmptyArrays: true,
    },
  })

  pipeline.push({
    $lookup: {
      from: 'grouppostcomments',
      let: {
        postId: '$_id',
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: ['$$postId', '$post'],
            },
          },
        },
      ],
      as: 'comments',
    },
  })

  pipeline.push({
    $lookup: {
      from: 'grouppostlikes',
      let: {
        postId: '$_id',
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: ['$$postId', '$post'],
            },
          },
        },
      ],
      as: 'likes',
    },
  })

  pipeline.push({
    $lookup: {
      from: 'reports',
      let: {
        postId: '$_id',
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: ['$post', '$$postId'],
            },
          },
        },
      ],
      as: 'reports',
    },
  })

  // // Final projection
  pipeline.push({
    $project: {
      _id: 1,
      content: 1,
      attachments: 1,

      // Flatten author
      authorId: '$author._id',

      authorName: '$author.name',
      authorEmail: '$author.email',
      authorStatus: '$author.status',
      authorRole: '$author.role',
      authorImage: '$author.profileImage',
      affiliation: '$author.profile.affiliation',
      // Flatten station
      groupId: '$group._id',
      groupType: '$group.type',
      groupTimeline: '$group.timeline',

      comments: {
        $size: '$comments',
      },
      likes: {
        $size: '$likes',
      },
      isAuthor: 1,
      totalReports: {
        $size: '$reports',
      },

      hasReported: {
        $gt: [
          {
            $size: {
              $filter: {
                input: '$reports',
                as: 'report',
                cond: {
                  $eq: ['$$report.reporter', new Types.ObjectId(user._id)],
                },
              },
            },
          },
          0,
        ],
      },
      isLikedByMe: {
        $gt: [
          {
            $size: {
              $filter: {
                input: '$likes',
                as: 'like',
                cond: {
                  $eq: ['$$like.user', new Types.ObjectId(user?._id)],
                },
              },
            },
          },
          0,
        ],
      },

      // timestamps
      createdAt: 1,
      updatedAt: 1,
    },
  })

  //  searchable fields:
  const searchableFields = ['authorName', 'authorEmail', 'content']

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: searchableFields.map((field) => {
          return { [field]: { $regex: searchTerm, $options: 'i' } }
        }),
      },
    })
  }

  // // sorting:
  pipeline.push({
    $sort: {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    },
  })

  pipeline.push({
    $facet: {
      data: [
        {
          $skip: skip,
        },
        {
          $limit: dataLimit,
        },
      ],
      meta: [
        {
          $count: 'total',
        },
      ],
    },
  })

  // 4. Run Aggregation :
  const posts = await GroupPost.aggregate(pipeline)

  const data = posts[0].data
  const total = posts[0]?.meta[0]?.total || 0
  const totalPages = Math.ceil(total / limit)

  return {
    data,
    meta: {
      page: Number(page),
      limit: dataLimit,
      total,
      totalPages,
    },
  }
}

const deletePostById = async (user: IUser, postId: string) => {
  const session = await mongoose.startSession()

  try {
    session.startTransaction()

    // 1. Check if post exists
    const existingPost = await GroupPost.findById(postId).session(session)

    if (!existingPost) {
      throw new AppError(httpStatus.NOT_FOUND, `Post not found!`)
    }

    // 2. Authorization check
    if (existingPost.author?.toString() !== user?._id?.toString()) {
      throw new AppError(httpStatus.FORBIDDEN, `You are not allowed to delete this post.`)
    }

    // 3. check membership:
    const membership = await GroupMember.findOne({
      user: user?._id,
      group: existingPost?.group,
      status: MembershipStatus.ACTIVE,
    })
    if (!membership) {
      throw new AppError(httpStatus.BAD_REQUEST, `You aren't active member of this group.!`)
    }

    // 4. COLLECT ALL COMMENT ATTACHMENTS BEFORE DELETING FROM DB
    // Fetch only the attachments field from all comments related to this post
    const commentsWithFiles = await GroupPostComment.find(
      { post: postId, attachments: { $exists: true, $not: { $size: 0 } } },
      { attachments: 1 }
    ).session(session)

    // Flatten the array of arrays into a single list of S3 URLs/Keys
    const allCommentAttachments = commentsWithFiles.reduce((acc, curr) => {
      return [...acc, ...(curr.attachments || [])]
    }, [] as string[])

    // 4. Delete related comments from Database
    await GroupPostComment.deleteMany({ post: postId }, { session })

    // 5. Delete related likes from Database
    await GroupPostLike.deleteMany({ post: postId }, { session })

    // 6. Delete the Post itself from Database
    const deletedPost = await GroupPost.findByIdAndDelete(postId, { session })

    // 7. Commit DB changes
    await session.commitTransaction()
    session.endSession()

    // 8. CLEANUP S3 (External Service)
    // Combine post attachments and comment attachments for a single S3 cleanup call
    const filesToDelete = [...(existingPost.attachments || []), ...allCommentAttachments]

    if (filesToDelete.length > 0) {
      // It's better to filter for unique values if a file might be referenced twice
      const uniqueFiles = [...new Set(filesToDelete)]
      logger.info('uniqueFiles', uniqueFiles)
      await deleteMultipleFilesFromS3(uniqueFiles)
    }

    return deletedPost
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    throw error
  }
}

export const groupPostServices = {
  createGroupPost,
  deletePostAttachment,
  updateGroupPost,
  getPostById,
  getUserGroupPostsByUserId,
  deletePostById,
}
