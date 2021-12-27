let fontShower = document.querySelector('#font-shower');
let htmlDocument = document.querySelector('html');
let pageInput = document.querySelector('#page');

let globalZoom = parseInt(localStorage.getItem("zoom"));


const zoom = (zoomValue) => {
    let pageValue = parseInt(pageInput.value);
    let thisPage = pageValue;
    let nextPage = pageValue + 2;
    htmlDocument.style.zoom = zoomValue + '%';
    fontShower.innerText = `بزرگ‌ نمایی برنامه: %  ${zoomValue}`;
    app.router.navigate('quran/p'+ nextPage, {trigger: true, replace: true});
    app.router.navigate('quran/p'+ thisPage, {trigger: true, replace: true});
};


const increaseZoom = () => {
    if (globalZoom < 130){
        globalZoom += 10;
        zoom(globalZoom);
        localStorage.setItem("zoom",globalZoom.toString());
    }
}

const decreaseZoom = () => {
    if (globalZoom > 70){
        globalZoom -= 10;
        zoom(globalZoom);
        localStorage.setItem("zoom",globalZoom.toString());
    }
}

if(isNaN(globalZoom)) {
    globalZoom = 100;
} else {
    zoom(globalZoom);
}
