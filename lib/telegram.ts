// lib/telegram.ts — Gửi thông báo Telegram Bot

export async function sendTelegramMessage(
  message: string,
  options?: {
    botToken?: string;
    chatId?: string;
    enabled?: boolean;
  }
): Promise<boolean> {
  const enabled = options?.enabled ?? true;
  const botToken = options?.botToken || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = options?.chatId || process.env.TELEGRAM_CHAT_ID;

  if (!enabled || !botToken || !chatId) {
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json();
    return !!data?.ok;
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    return false;
  }
}
