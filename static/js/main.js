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

function openGithubProfileFromUserId(id) {
    fetch('https://api.github.com/user/' + id)
        .then(response => response.json())
        .then(data => {
            var github_user_url = data["html_url"]
            window.open(github_user_url, "_blank")
            return false
        }
    );
}
