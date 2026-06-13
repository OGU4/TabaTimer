import {
  waitForEvenAppBridge,
  CreateStartUpPageContainer,
  TextContainerProperty,
} from '@evenrealities/even_hub_sdk';
import type { EvenAppBridge } from '@evenrealities/even_hub_sdk';

const BRIDGE_TIMEOUT_MS = 8000;
const DISPLAY_TEXT = 'Hello World';

function waitForBridgeWithTimeout(timeoutMs: number): Promise<EvenAppBridge> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`bridge not available within ${timeoutMs}ms`)),
      timeoutMs,
    );
    waitForEvenAppBridge().then((bridge) => {
      clearTimeout(timer);
      resolve(bridge);
    });
  });
}

async function main(): Promise<void> {
  console.log('[hello] page loaded');

  let bridge: EvenAppBridge;
  try {
    bridge = await waitForBridgeWithTimeout(BRIDGE_TIMEOUT_MS);
  } catch (err) {
    console.error(
      `[hello] ${(err as Error).message} — open this page via evenhub-simulator, not a normal browser`,
    );
    return;
  }
  console.log('[hello] bridge acquired');

  const result = await bridge.createStartUpPageContainer(
    new CreateStartUpPageContainer({
      containerTotalNum: 1,
      textObject: [
        new TextContainerProperty({
          xPosition: 138,
          yPosition: 104,
          width: 300,
          height: 80,
          containerID: 1,
          containerName: 'hello-text',
          content: DISPLAY_TEXT,
          isEventCapture: 1,
        }),
      ],
    }),
  );

  if (result === 0) {
    console.log(`[hello] displayed: ${DISPLAY_TEXT}`);
  } else {
    const meaning =
      ({ 1: 'Invalid', 2: 'Oversize', 3: 'OutOfMemory' } as Record<number, string>)[result] ??
      'Unknown';
    console.error(`[hello] createStartUpPageContainer failed: result=${result} (${meaning})`);
  }
}

main().catch((err) => {
  console.error('[hello] unhandled error:', err);
});
