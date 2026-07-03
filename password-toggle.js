document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.toggle-password').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = btn.parentElement.querySelector('input[type="password"], input[type="text"]');
      if (!input) return;
      var showing = btn.classList.toggle('showing');
      input.type = showing ? 'text' : 'password';
      btn.setAttribute('aria-label', showing ? '隐藏密码' : '显示密码');
    });
  });
});
