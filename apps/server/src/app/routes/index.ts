import { authRoutes } from '@app/modules/Auth/user.routes'
import { branchRoutes } from '@app/modules/Branch/branch.route'
import { communitCommentRoutes } from '@app/modules/CommunityPostComments/community-post-comments.routes'
import { communityPostRoutes } from '@app/modules/CommunityPosts/community-post.routes'
import { contentRoutes } from '@app/modules/Content/content.route'
import { DutyStationRoutes } from '@app/modules/DutyStation/duty-station.routes'
import { faqRoutes } from '@app/modules/Faq/faq.routes'
import { groupRoutes } from '@app/modules/Group/group.routes'
import { groupPostRoutes } from '@app/modules/GroupPost/group-post.routes'
import { groupCommentRoutes } from '@app/modules/GroupPostComment/group-post-comment.routes'
import { groupPostLikeRoutes } from '@app/modules/GroupPostLike/post-like.routes'
import { communityLikeRoutes } from '@app/modules/PostLike/post-like.routes'
import express, { Router } from 'express'

const router: Router = express.Router()

const routes = [
  {
    path: '/auth',
    route: authRoutes,
  },
  {
    path: '/branches',
    route: branchRoutes,
  },
  {
    path: '/dutystations',
    route: DutyStationRoutes,
  },
  {
    path: '/community-posts',
    route: communityPostRoutes,
  },
  {
    path: '/community-comments',
    route: communitCommentRoutes,
  },
  {
    path: '/community-likes',
    route: communityLikeRoutes,
  },
  {
    path: '/contents',
    route: contentRoutes,
  },
  {
    path: '/faq',
    route: faqRoutes,
  },
  {
    path: '/group',
    route: groupRoutes,
  },
  {
    path: '/group/posts',
    route: groupPostRoutes,
  },
  {
    path: '/group-comments',
    route: groupCommentRoutes,
  },
  {
    path: '/group-likes',
    route: groupPostLikeRoutes,
  },
]

routes.forEach((route) => router.use(route.path, route.route))

export const allRoutes = router
