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

// Code from: https://gist.github.com/zjeaton/0cdd7e4bed9d292ab6f3d76b0369f16d
// Open the Modal
function openModal(clicked_id) {
    var src = document.getElementById(clicked_id).src;
    if (src.includes("#")) {
        src = src.substring(0, src.indexOf( "#" ));
    };
    document.getElementById("modalPic").src = src;
    document.getElementById("myModal").style.display = "block";
}

// Close the Modal
function closeModal() {
    // prevents flashing last modal image while new id is loading on open
    document.getElementById("modalPic").src = "";
    document.getElementById("myModal").style.display = "none";
}

// also close the modal if escape key is pressed
document.onkeydown = function(evt) {
    evt = evt || window.event;
    if (evt.keyCode == 27) {
        closeModal();
    }
};
