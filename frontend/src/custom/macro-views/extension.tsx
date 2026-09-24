// 宏观看板集（二次开发扩展入口）。
// 依据 docs/secondary-development.md：完整页面必须走扩展机制注册（routes + navigation），
// 入口文件名固定为 extension.tsx，由 main.tsx 的 initializeFrontendExtensions() 自动发现，
// 因此本模块不修改 router.tsx / Layout.tsx / lib/api.ts 等核心热点文件。
// 数据说明：本模块全部为演示 mock（见 lib/mock.ts 顶部注释），不接后端接口。
import { Activity } from 'lucide-react'
import type { FrontendExtension, FrontendExtensionRoute } from '@/extensions/types'
import { MacroHome } from './boards/MacroHome'
import { GoldBoard } from './boards/GoldBoard'
import { UsEquityBoard } from './boards/UsEquityBoard'
import { UsTreasuryBoard } from './boards/UsTreasuryBoard'
import { AShareBoard } from './boards/AShareBoard'
import { CnBondBoard } from './boards/CnBondBoard'
import { DailyReview } from './boards/DailyReview'
import { WeeklyReport } from './boards/WeeklyReport'
import { LongTermAssetsBoard } from './boards/LongTermAssetsBoard'
import { BOARDS, HOME_PATH } from './lib/boards'

const extension: FrontendExtension = {
  id: 'research.macro-views',
  apiVersion: 1,
  routes: [
    { id: 'research-macro-home', path: HOME_PATH, component: MacroHome },
    ...BOARDS.map((board): FrontendExtensionRoute => ({ id: board.routeId, path: board.path, component: componentFor(board.key) })),
  ],
  // 侧栏只放一个入口（首页），8 个看板通过首页星轨与每页底部的看板导航互跳，避免侧栏被 9 项占满
  navigation: [
    { id: 'research-macro-home', routeId: 'research-macro-home', label: '宏观看板集', icon: Activity, order: 320 },
  ],
}

/** key → 页面组件；集中在一处便于新增看板时编译器直接报缺失 */
function componentFor(key: string) {
  switch (key) {
    case 'gold':
      return GoldBoard
    case 'us-equity':
      return UsEquityBoard
    case 'us-treasury':
      return UsTreasuryBoard
    case 'a-share':
      return AShareBoard
    case 'cn-bond':
      return CnBondBoard
    case 'daily-review':
      return DailyReview
    case 'weekly':
      return WeeklyReport
    case 'longterm-assets':
      return LongTermAssetsBoard
    default:
      return MacroHome
  }
}

export default extension
