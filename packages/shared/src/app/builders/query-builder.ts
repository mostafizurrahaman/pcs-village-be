import { Query } from 'mongoose'

export class QueryBuilder<T> {
  public modelQuery: Query<T[], T>
  public query: Record<string, unknown>

  // create a constructor to assign modelQuery and query:
  constructor(modelQuery: Query<T[], T>, query: Record<string, unknown>) {
    this.modelQuery = modelQuery
    this.query = query
  }

  // create a search  method:
  search(searchFields: string[]) {
    const searchTerm: string = (this.query.searchTerm as string) || ''
    this.modelQuery = this.modelQuery.find({
      $or: searchFields.map((field: string) => {
        return {
          [field]: { $regex: searchTerm, $options: 'i' },
        }
      }),
    })

    return this
  }

  // create a filter method:

  filter() {
    // copy the query:
    const queryObject = { ...this.query }

    // excluding fields array:
    const excludeFields = ['searchTerm', 'sort', 'limit', 'page', 'fields']

    //exclude now :
    excludeFields.forEach((el: string) => delete queryObject[el])

    //filter now :
    this.modelQuery = this.modelQuery.find(queryObject)

    return this
  }

  // create as sort function :
  sort() {
    const sort = this.query.sort
      ? (this?.query?.sort as string)?.split(',')?.join(' ')
      : '-createdAt'

    this.modelQuery = this.modelQuery.sort(sort)

    return this
  }

  // paginate method:

  paginate() {
    const limit = Number(this.query.limit) || 10
    const page = Number(this.query.page) || 1
    const skip = (page - 1) * limit
    this.modelQuery = this.modelQuery.skip(skip).limit(limit)

    return this
  }

  // select fields method :
  fields() {
    const fields = (this?.query?.fields as string)?.split(',')?.join(' ') || '-__v'

    this.modelQuery = this.modelQuery.select(fields)
    return this
  }

  //  ** Count Total :
  async countTotal() {
    const filter = this.modelQuery.getFilter()
    // console.log(filter);
    const total = await this.modelQuery.model.countDocuments(filter)

    //  ** page :
    const page = Number(this.query.page) || 1
    const limit = Number(this.query.limit) || 10
    const totalPages = Math.ceil(total / limit)
    return {
      total,
      page,
      limit,
      totalPages,
    }
  }
}
