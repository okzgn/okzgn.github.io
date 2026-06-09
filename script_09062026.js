/*
  Welcome to OKZGN main landing page script.
  The entire website was written by Elias Alvarado Soshina.
  https://github.com/okzgn
  hello@okzgn.com

  Psalm 73:25... I used to think so, but not at this moment, I find that I'm not that good.
*/

document.addEventListener('DOMContentLoaded', function () {
    var menuButton = document.getElementById('menu');

    window.addEventListener('scroll', function(){
        if(window.scrollY > 480){
            menuButton.classList.add('show');
        }
        else {
            menuButton.classList.remove('show');
        }
    });

    menuButton.addEventListener('click', function(){
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
});
