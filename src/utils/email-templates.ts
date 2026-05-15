export const verificationCodeEmail = (code: string | number): string => `
<div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:30px;border:1px solid #ddd;border-radius:10px;background:#f9f9f9">
  <div style="text-align:center">
    <h2 style="color:#333">Verify your email</h2>
    <p style="font-size:16px;color:#555;margin:10px 0">Enter the code below to confirm your email address:</p>
    <div style="display:inline-block;padding:12px 24px;background:#268ACA;color:#fff;font-size:24px;letter-spacing:4px;border-radius:8px;font-weight:bold;margin-top:15px">${code}</div>
    <p style="font-size:14px;color:#999;margin-top:20px">This code expires in 3 minutes.</p>
  </div>
</div>`;

export const passwordResetEmail = (code: string | number): string => `
<div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:30px;border:1px solid #ddd;border-radius:10px;background:#f9f9f9">
  <div style="text-align:center">
    <h2 style="color:#333">Reset your password</h2>
    <p style="font-size:16px;color:#555;margin:10px 0">Enter the code below to set a new password:</p>
    <div style="display:inline-block;padding:12px 24px;background:#268ACA;color:#fff;font-size:24px;letter-spacing:4px;border-radius:8px;font-weight:bold;margin-top:15px">${code}</div>
    <p style="font-size:14px;color:#999;margin-top:20px">This code expires in 10 minutes.</p>
  </div>
</div>`;
