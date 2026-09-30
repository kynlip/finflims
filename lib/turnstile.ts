export async function verifyTurnstileToken(
  token?: string | null,
  ip?: string | null
): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  
  // If no secret key is set, skip verification
  if (!secretKey) return true;
  
  // If secret key is set but no token is passed, reject
  if (!token) return false;

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (ip) formData.append('remoteip', ip);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const data = await res.json();
    return Boolean(data.success);
  } catch (error) {
    console.error('Turnstile verification error:', error);
    // Fail-open in case of unexpected network failure to not lock legitimate users out
    return true;
  }
}
