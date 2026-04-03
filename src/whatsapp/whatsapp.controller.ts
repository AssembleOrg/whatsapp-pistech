import { Controller, Get, Post, Query, Res, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import QRCode from 'qrcode';
import { WhatsAppService } from './whatsapp.service';

@ApiExcludeController()
@Controller('whatsapp')
export class WhatsAppController {
  constructor(
    private readonly whatsapp: WhatsAppService,
    private readonly config: ConfigService,
  ) {}

  @Get('qr')
  getQrPage(@Query('password') password: string, @Res() res: Response) {
    const expected = this.config.get<string>('QR_PASSWORD');

    if (!password) {
      return res.status(HttpStatus.OK).send(this.renderPasswordPage());
    }

    if (password !== expected) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .send(this.renderPasswordPage('Contrasena incorrecta'));
    }

    return res.status(HttpStatus.OK).send(this.renderQrPage(password));
  }

  @Get('status')
  getStatus() {
    return {
      state: this.whatsapp.getConnectionState(),
      hasQR: this.whatsapp.getQrCode() !== null,
    };
  }

  @Get('qr-data')
  async getQrData(
    @Query('password') password: string,
    @Res() res: Response,
  ) {
    const expected = this.config.get<string>('QR_PASSWORD');
    if (password !== expected) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Unauthorized' });
    }

    const qrString = this.whatsapp.getQrCode();
    let qrImage: string | null = null;

    if (qrString) {
      qrImage = await QRCode.toDataURL(qrString, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
    }

    return res.json({
      qrImage,
      state: this.whatsapp.getConnectionState(),
    });
  }

  @Post('clear-session')
  async clearSession(
    @Query('password') password: string,
    @Res() res: Response,
  ) {
    const expected = this.config.get<string>('QR_PASSWORD');
    if (password !== expected) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Unauthorized' });
    }

    await this.whatsapp.clearSession();
    return res.json({ message: 'Session cleared, reconnecting...' });
  }

  private renderPasswordPage(error?: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pistech WhatsApp - Login</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e0e0e0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .card { background: #1a1a1a; border-radius: 12px; padding: 2rem; width: 360px; box-shadow: 0 4px 24px rgba(0,0,0,0.5); }
    h1 { font-size: 1.4rem; margin-bottom: 1.5rem; text-align: center; }
    input { width: 100%; padding: 0.75rem; border: 1px solid #333; border-radius: 8px; background: #0a0a0a; color: #e0e0e0; font-size: 1rem; margin-bottom: 1rem; }
    button { width: 100%; padding: 0.75rem; border: none; border-radius: 8px; background: #25D366; color: #000; font-weight: 600; font-size: 1rem; cursor: pointer; }
    button:hover { background: #1ebe57; }
    .error { color: #ff4444; text-align: center; margin-bottom: 1rem; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Pistech WhatsApp</h1>
    ${error ? `<p class="error">${error}</p>` : ''}
    <form method="GET" action="/whatsapp/qr">
      <input type="password" name="password" placeholder="Contrasena" required autofocus />
      <button type="submit">Ingresar</button>
    </form>
  </div>
</body>
</html>`;
  }

  private renderQrPage(password: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pistech WhatsApp - QR</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e0e0e0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .card { background: #1a1a1a; border-radius: 12px; padding: 2rem; width: 420px; box-shadow: 0 4px 24px rgba(0,0,0,0.5); text-align: center; }
    h1 { font-size: 1.4rem; margin-bottom: 1rem; }
    .status { padding: 0.5rem 1rem; border-radius: 20px; display: inline-block; margin-bottom: 1.5rem; font-weight: 600; font-size: 0.9rem; }
    .status.open { background: #25D366; color: #000; }
    .status.connecting { background: #f59e0b; color: #000; }
    .status.disconnected { background: #ef4444; color: #fff; }
    #qr-container { background: #fff; border-radius: 12px; padding: 1rem; margin: 1rem 0; min-height: 264px; display: flex; align-items: center; justify-content: center; }
    #qr-container img { max-width: 100%; border-radius: 8px; }
    .no-qr { color: #666; font-size: 0.9rem; }
    .actions { margin-top: 1.5rem; }
    .btn { padding: 0.6rem 1.2rem; border: none; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; margin: 0.25rem; }
    .btn-danger { background: #ef4444; color: #fff; }
    .btn-danger:hover { background: #dc2626; }
    .btn-secondary { background: #333; color: #e0e0e0; }
    .btn-secondary:hover { background: #444; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Pistech WhatsApp</h1>
    <div id="status" class="status disconnected">Desconectado</div>
    <div id="qr-container">
      <span class="no-qr">Esperando QR...</span>
    </div>
    <div class="actions">
      <button class="btn btn-danger" onclick="clearSession()">Borrar sesion</button>
      <button class="btn btn-secondary" onclick="location.href='/whatsapp/qr'">Cerrar</button>
    </div>
  </div>

  <script>
    const PASSWORD = '${password}';

    async function fetchStatus() {
      try {
        const res = await fetch('/whatsapp/qr-data?password=' + encodeURIComponent(PASSWORD));
        if (!res.ok) return;
        const data = await res.json();
        updateUI(data);
      } catch (e) {}
    }

    function updateUI(data) {
      const statusEl = document.getElementById('status');
      const qrContainer = document.getElementById('qr-container');

      statusEl.className = 'status ' + data.state;
      const labels = { open: 'Conectado', connecting: 'Conectando...', disconnected: 'Desconectado' };
      statusEl.textContent = labels[data.state] || data.state;

      if (data.state === 'open') {
        qrContainer.innerHTML = '<span class="no-qr" style="color:#25D366;font-size:1.5rem;">Conectado</span>';
        return;
      }

      if (data.qrImage) {
        qrContainer.innerHTML = '<img src="' + data.qrImage + '" alt="QR Code" />';
      } else {
        qrContainer.innerHTML = '<span class="no-qr">Esperando QR...</span>';
      }
    }

    async function clearSession() {
      if (!confirm('Borrar sesion? Debera escanear el QR nuevamente.')) return;
      await fetch('/whatsapp/clear-session?password=' + encodeURIComponent(PASSWORD), { method: 'POST' });
    }

    setInterval(fetchStatus, 3000);
    fetchStatus();
  <\/script>
</body>
</html>`;
  }
}
