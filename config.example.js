// config.example.js
// 本地开发时，请复制本文件为 config.js，并替换为真实值
// config.js 已加入 .gitignore，不会提交到仓库

window.__BILIGUARD_CONFIG__ = {
  // 后端 API 基础地址
  apiBaseUrl: 'https://your-api-domain.com/7wa',

  // Stripe 支付配置（可选）
  stripe: {
    publishableKey: 'pk_test_your_stripe_publishable_key',
    premiumPricingTableId: 'prctbl_your_premium_table_id',
    lifetimePricingTableId: 'prctbl_your_lifetime_table_id'
  },

  // 联系方式（可选）
  contact: {
    whatsapp: 'https://wa.me/your-whatsapp-number',
    email: 'your-email@example.com'
  }
};
