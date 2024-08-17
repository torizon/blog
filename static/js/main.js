/**
 * Add the nav and footer box shadow when the user scrolls down
 */
window.addEventListener('scroll', () => {
    const nav = document.querySelector('nav');
    const footer = document.querySelector('footer');
    const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;

    if (window.scrollY >= (maxScrollY - footer.offsetHeight)) {
        footer.classList.remove('footer-scrolled');
    } else if (window.scrollY > 0) {
        nav.classList.add('nav-scrolled');
        footer.classList.add('footer-scrolled');
    } else {
        nav.classList.remove('nav-scrolled');
        footer.classList.add('footer-scrolled');
    }
});
