// payment.js - 插件端支付跳转页
// 直接调用后端创建 Stripe Checkout Session，然后跳转

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('stripe-container');
  const btnBack = document.getElementById('btn-back');

  const params = new URLSearchParams(window.location.search);
  const plan = params.get('plan') || 'premium';

  if (btnBack) {
    btnBack.addEventListener('click', () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.close();
      }
    });
  }

  try {
    const [authRes, urlRes] = await Promise.all([
      chrome.runtime.sendMessage({ action: 'getAuth' }),
      chrome.runtime.sendMessage({ action: 'getApiBaseUrl' })
    ]);

    const token = authRes?.data?.token;
    if (!token) {
      container.innerHTML = '<div class="error">请先登录</div>';
      return;
    }

    const baseUrl = urlRes?.data;
    if (!baseUrl) {
      container.innerHTML = '<div class="error">API 地址未配置</div>';
      return;
    }

    const apiUrl = `${baseUrl}/bg/payment/create-checkout-session?plan=${encodeURIComponent(plan)}&successUrl=${encodeURIComponent('https://main.biliguard.pages.dev/index.html#account')}&cancelUrl=${encodeURIComponent('https://main.biliguard.pages.dev/index.html#account')}`;

    const resp = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'At': token,
        'Content-Type': 'application/json'
      }
    });

    const result = await resp.json();
    if (result.success && result.data?.url) {
      window.location.href = result.data.url;
    } else {
      container.innerHTML = `<div class="error">${result.note || '创建支付会话失败'}</div>`;
    }
  } catch (e) {
    console.error('创建支付会话异常', e);
    container.innerHTML = '<div class="error">支付页面加载异常</div>';
  }
});
