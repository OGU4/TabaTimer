import {
  waitForEvenAppBridge,
  CreateStartUpPageContainer,
  TextContainerProperty,
  TextContainerUpgrade,
  OsEventTypeList,
} from '@evenrealities/even_hub_sdk';
import type {
  EvenAppBridge,
  EvenHubEvent,
} from '@evenrealities/even_hub_sdk';

const BRIDGE_TIMEOUT_MS = 8000; // feat-001 から継続
const UPDATE_INTERVAL_MS = 1000; // 更新ループ間隔
const CONTAINER_ID = 1; // 時刻表示コンテナのID
const CONTAINER_NAME = 'clock'; // 最大16文字
const SHUTDOWN_EXIT_MODE = 0; // 0=即終了・キャンセル不可(feat-003 で 1 から変更。design.md 4.4 ADR 参照)
// コンテナのレイアウト(中央寄せ)。feat-001 の Hello World と同系の配置
const CLOCK_X = 138;
const CLOCK_Y = 104;
const CLOCK_W = 300;
const CLOCK_H = 80;

const CONTAINER_RESULT_MEANING: Record<number, string> = {
  1: 'Invalid',
  2: 'Oversize',
  3: 'OutOfMemory',
};

let bridge: EvenAppBridge;
let intervalId: ReturnType<typeof setInterval> | null = null;
let unsubscribe: (() => void) | null = null;
let unsubscribeLaunch: (() => void) | null = null; // onLaunchSource の購読解除関数(feat-003)
let cleanedUp = false;
// 直列化で前回更新の完了を待ってから次を投げる
let rendering: Promise<unknown> = Promise.resolve();

function waitForBridgeWithTimeout(timeoutMs: number): Promise<EvenAppBridge> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`bridge not available within ${timeoutMs}ms`)),
      timeoutMs,
    );
    waitForEvenAppBridge().then((b) => {
      clearTimeout(timer);
      resolve(b);
    });
  });
}

// getHours/Minutes/Seconds はローカル時刻(24時間制)を返す
function formatClock(date: Date): string {
  const pad = (n: number): string => n.toString().padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// 毎回 new Date() を読み直し、直列化付きで反映する(累積ドリフトを表示に持ち込まない)
function renderTime(): void {
  const content = formatClock(new Date());
  rendering = rendering
    .then(() =>
      bridge.textContainerUpgrade(
        new TextContainerUpgrade({
          containerID: CONTAINER_ID,
          containerName: CONTAINER_NAME,
          content,
        }),
      ),
    )
    .catch((err) => {
      // 単発失敗はログのみ。ループは継続し次秒で復帰を試みる
      console.error('[clock] textContainerUpgrade failed:', err);
    });
}

function startClockLoop(): void {
  intervalId = setInterval(renderTime, UPDATE_INTERVAL_MS);
}

function stopClockLoop(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

// ループ停止 + 全購読解除 + リスナー解除(冪等)。部分初期化済み状態でも安全
function cleanup(): void {
  if (cleanedUp) {
    return;
  }
  cleanedUp = true;
  stopClockLoop(); // intervalId が null でも安全
  if (unsubscribe !== null) {
    unsubscribe();
    unsubscribe = null;
  }
  if (unsubscribeLaunch !== null) {
    unsubscribeLaunch();
    unsubscribeLaunch = null;
  }
  // 登録時と同一の cleanup 参照で解除し、リスナーの多重登録を残さない
  window.removeEventListener('beforeunload', cleanup);
  console.log('[lifecycle] cleanup done');
}

// onLaunchSource を登録し起動元をログ出力する(画面分岐はしない)
function registerLaunchSource(): void {
  unsubscribeLaunch = bridge.onLaunchSource((source) => {
    // 起動元による分岐はしない。記録のみ(将来の分岐・実機デバッグ用)
    console.log(`[lifecycle] launch source: ${source}`);
  });
}

// EvenHub イベントを振り分ける(終了 / ライフサイクル終了 / 前面背面)
function handleEvenHubEvent(event: EvenHubEvent): void {
  // Protobuf はゼロ値を省くため ?? null で coalesce(誤判定防止)
  const sysType = event.sysEvent?.eventType ?? null;
  const textType = event.textEvent?.eventType ?? null;

  // ダブルタップ → 終了(どちらの envelope でも受ける)
  if (
    sysType === OsEventTypeList.DOUBLE_CLICK_EVENT ||
    textType === OsEventTypeList.DOUBLE_CLICK_EVENT
  ) {
    cleanup();
    bridge.shutDownPageContainer(SHUTDOWN_EXIT_MODE); // 0=即終了・キャンセル不可
    return;
  }

  // ライフサイクル終了 → 後始末
  if (
    sysType === OsEventTypeList.SYSTEM_EXIT_EVENT ||
    sysType === OsEventTypeList.ABNORMAL_EXIT_EVENT
  ) {
    cleanup();
    return;
  }

  // 前面/背面遷移 → ループは止めない(更新継続)。ログのみ
  if (
    sysType === OsEventTypeList.FOREGROUND_ENTER_EVENT ||
    sysType === OsEventTypeList.FOREGROUND_EXIT_EVENT
  ) {
    console.log(`[lifecycle] foreground event: ${sysType}`);
    return;
  }
}

async function main(): Promise<void> {
  console.log('[lifecycle] page loaded');

  try {
    bridge = await waitForBridgeWithTimeout(BRIDGE_TIMEOUT_MS);
  } catch (err) {
    console.error(
      `[lifecycle] ${(err as Error).message} — open this page via evenhub-simulator, not a normal browser`,
    );
    return;
  }
  console.log('[lifecycle] bridge acquired');

  // 起動元の通知は「ロード完了後1回限り」のため、画面生成より前に早期登録する
  registerLaunchSource();

  const initialContent = formatClock(new Date());
  const result = await bridge.createStartUpPageContainer(
    new CreateStartUpPageContainer({
      containerTotalNum: 1,
      textObject: [
        new TextContainerProperty({
          xPosition: CLOCK_X,
          yPosition: CLOCK_Y,
          width: CLOCK_W,
          height: CLOCK_H,
          containerID: CONTAINER_ID,
          containerName: CONTAINER_NAME,
          content: initialContent,
          isEventCapture: 1,
        }),
      ],
    }),
  );

  if (result !== 0) {
    const meaning = CONTAINER_RESULT_MEANING[result] ?? 'Unknown';
    console.error(`[lifecycle] createStartUpPageContainer failed: result=${result} (${meaning})`);
    // 登録済みの onLaunchSource 購読をリークさせないため後始末してから中止する
    cleanup();
    return;
  }
  console.log(`[lifecycle] displayed: ${initialContent}`);

  // 初期表示済みのため即時 renderTime はせず、次の1秒後の発火に任せる
  startClockLoop();

  unsubscribe = bridge.onEvenHubEvent(handleEvenHubEvent);

  // ページ破棄時の後始末を保証する
  window.addEventListener('beforeunload', cleanup);
}

main().catch((err) => {
  console.error('[lifecycle] unhandled error:', err);
});
