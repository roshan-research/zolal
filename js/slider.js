let fontSlider = document.querySelector('#font-slider input');
let fontShower = document.querySelector('#font-shower');
let htmlDocument = document.querySelector('html');
let pageInput = document.querySelector('#page');

fontSlider.oninput = () => {
    let pageValue = parseInt(pageInput.value);
    let thisPage = pageValue;
    let nextPage = pageValue + 2;
    let zoomValue = fontSlider.value;
    if (zoomValue <= 105 && zoomValue >= 95) {
        fontShower.innerText = 'بزرگ‌ نمایی برنامه: متوسط';
    } else if (zoomValue > 105) {
        fontShower.innerText = 'بزرگ‌ نمایی برنامه: بزرگ';
    } else {
        fontShower.innerText = 'بزرگ‌ نمایی برنامه: کوچک';
    }
    htmlDocument.style.zoom = zoomValue + '%';
    app.router.navigate('quran/p'+ nextPage, {trigger: true, replace: true});
    app.router.navigate('quran/p'+ thisPage, {trigger: true, replace: true});
}

window.onchange = () => {

}
