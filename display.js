const request = require('request');
const DomParser = require('dom-parser');
require('datejs');

let eventList = [],
    nextEventToSlideify = -1,
    previousSlide = null,
    currentSlide = null,
    nextSlide = null;


Date.prototype.toDateStringFormatted = function() {
    /* Today */
    if (this.isToday()) {
        if (parseInt(this.format('G')) >= 17) { // 5pm or later
            return "Tonight";
        } else {
            return "Today";
        }
    }

    /* Tomorrow */
    if (Date.today().addDays(1).format('Ymd') === this.format('Ymd')) {
        return "Tomorrow";
    }

    /* This week */
    if (this.getTime() - Date.today().getTime() < 7 * 86400 * 1000) {
        return "This " + this.format('l');
    }

    /* Next week */
    if (this.getTime() - Date.today().getTime() < 14 * 86400 * 1000) {
        return "Next " + this.format('D, M %e');
    }

    /* Other Times */
    return this.format('l, M %e');
};


Date.prototype.toTimeStringFormatted = function() {
    /** @var String string */
    let string = this.format('%r');

    if (string[0] === '0')
        string = string.substr(1);

    string = string.replace(' ', '').toLowerCase();

    return string;
};


function updateEventList() {
    const d = new Date();
    const d1 = d.format('%b+d%2C+%Y');
    const d2 = d.addDays(15).format('%b+d%2C+%Y');


    request('https://tenth.gospel.io/events/features-json', eventsCallback);

    function eventsCallback(error, response, body) {
        let evts = JSON.parse(body),
            newEventList = [];

        for (let ei in evts) {
            if (!evts[ei].hasOwnProperty('title'))
                continue;

            let evtObj = {
                title: evts[ei].title,
                dtStart: new Date(Date.parse(evts[ei].start)),
                dtEnd: new Date(Date.parse(evts[ei].end)),
                ministry: evts[ei].ministry ? evts[ei].ministry : '',
                location: evts[ei].location,
                category: evts[ei].category,
                img: evts[ei].imageUrl,
                allDay: evts[ei].allDay,
                verb: evts[ei].verb
            };
            newEventList.push(evtObj)
        }

        eventList = newEventList;

        if (currentSlide === null)
            changeSlide();
    }
}
updateEventList();


function changeSlide() {
    if (previousSlide !== null) {
        document.getElementById('slideSpace').removeChild(previousSlide);
    }
    if (currentSlide !== null) {
        currentSlide.style.opacity = "0";
    }
    if (nextSlide !== null) {
        nextSlide.style.opacity = "1";
        if (typeof nextSlide.onShow === 'function')
            setTimeout(nextSlide.onShow, 100);
    }

    previousSlide = currentSlide;
    currentSlide = nextSlide;

    nextSlide = document.createElement('div');
    nextSlide.style.opacity = "0";
    document.getElementById('slideSpace').appendChild(nextSlide);

    if (nextEventToSlideify === -1) {
        nextSlide.innerHTML = "<div><h2>Welcome to Tenth</h2></div>";
        nextSlide.classList.add('welcome');
        nextSlide.style.backgroundPositionY = "100%";
        nextSlide.style.backgroundPositionX = "0";
        nextSlide.time = 8000;
        let _slide = nextSlide;
        nextSlide.onShow = function() {
            _slide.style.backgroundPositionY = "0";
            _slide.style.backgroundPositionX = "100%";
        }

    } else {
        let event;

        // skip any past events
        do {
            event = eventList[nextEventToSlideify++];
            event.tense = getTense(event);
        } while (event.tense < 0);
        nextEventToSlideify--;

        // events happening now
        if (event.tense === 0) {
            nextSlide.time = 3200;
            nextSlide.classList.add('happeningNow');
            let count = 0;
            let html = "<div><h2>Happening Now</h2><table>";

            while (event.tense === 0 && count++ < 3) {
                html += "<tr><td>" + event.title + "</td><td>" + event.location + "</td></tr>";
                nextSlide.time += 800;

                event = eventList[++nextEventToSlideify];
                event.tense = getTense(event);
            }
            nextEventToSlideify--;

            html += "</table></div>";
            nextSlide.innerHTML = html;

        // This Sunday
        // } else if (event.dtStart.format('D') === 'Sun' && Date.today().getWeek() === event.dtStart.getWeek()) {
        //     nextSlide.time = 1500;
        //     nextSlide.classList.add('thisSunday');
        //     let count = 0;
        //     let html = "";
        //
        //     if (Date.today().format('D') === "Sun")
        //         html += "<div><h2>Events Today</h2><table>";
        //     else
        //         html += "<div><h2>Events This Sunday</h2><table>";
        //
        //     /** @var Date event.dtStart */
        //     while (event.dtStart.format('D') === 'Sun' && Date.today().getWeek() === event.dtStart.getWeek() && count++ < 7) {
        //         html += "<tr><td class='right'>" + event.dtStart.toTimeStringFormatted() + "</td><td>" + event.title + "</td><td>" + event.location + "</td></tr>";
        //
        //         nextSlide.time += 750;
        //
        //         event = eventList[++nextEventToSlideify];
        //     }
        //     nextEventToSlideify--;
        //
        //     html += "</table></div>";
        //     nextSlide.innerHTML = html;

        // Everything else
        } else {
            var html = "<div>";
            html += "<h2>" + event.title + "</h2>";
            html += "<p>" + event.dtStart.toDateStringFormatted() + (event.allDay ? "" : " &sdot; <small class=\"time\">" + event.dtStart.toTimeStringFormatted()) + "</small></p>";
            if (event.verb !== "") {
                html += "<p>" + event.verb + " at tenth.org</p>";
            } else {
                html += "<p>" + event.location + "</p>";
            }
            html += "<p class='ministry'>" + event.ministry + "</p></div>";
            nextSlide.innerHTML = html;
            nextSlide.classList.add('single');
            nextSlide.time = 4000;

            if (event.hasOwnProperty('img') && event.img !== null)
                nextSlide.style.backgroundImage = "url('" + event.img + "')";
        }
    }

    nextEventToSlideify++;
    if (nextEventToSlideify >= eventList.length) {
        updateEventList();
        nextEventToSlideify = -1;
    }

    if (currentSlide === null)
        changeSlide();
    else
        setTimeout(changeSlide, currentSlide.time);
}

function getTense(eventObj) {
    const now = new Date();
    return eventObj.dtStart.compareTo(now) + eventObj.dtEnd.compareTo(now);
}
