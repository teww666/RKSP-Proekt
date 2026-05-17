import { createApp, getListenPort } from './app.factory';

export async function bootstrap(): Promise<void> {
  const app = await createApp();
  await app.listen(getListenPort(), '0.0.0.0');
}
