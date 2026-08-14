const menu = document.querySelector('.menu');
const navigation = document.querySelector('.site-header nav');
menu.addEventListener('click', () => {
  const isOpen = navigation.classList.toggle('open');
  menu.setAttribute('aria-expanded', isOpen);
  menu.textContent = isOpen ? 'Close' : 'Menu';
});
navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  navigation.classList.remove('open');
  menu.setAttribute('aria-expanded', 'false');
  menu.textContent = 'Menu';
}));
const dateInput = document.querySelector('input[name="preferred-date"]');
dateInput.min = new Date().toISOString().split('T')[0];
