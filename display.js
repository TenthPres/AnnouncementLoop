const request = require('request');
require('datejs');

let featuredEventList = [],
    currentEventList = [],
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


function updateEventLists() {

    request('https://www.tenth.org/wp-json/tribe/events/v1/events?featured=true&start_date=2022-01-29&end_date=2022-03-29&hide_subsequent_recurrences=1&per_page=200', featuredCallback);
    // request('https://www.tenth.org/events/all-json', allCallback);

    function featuredCallback(error, response) {
        if (error) {
            console.error(error);
            return;
        }

        let evts = JSON.parse(response.body.substr(1)).events,
            newEventList = [],
            newEventTitles = [];

        for (let ei in evts) {
            if (!evts.hasOwnProperty(ei))
                continue;

            if (!evts[ei].hasOwnProperty('title'))
                continue;

            if (newEventTitles.indexOf(evts[ei].title) > -1)
                continue;

            newEventTitles.push(evts[ei].title);

            let evtObj = {
                title: evts[ei].title,
                dtStart: new Date(Date.parse(evts[ei].start_date)),
                dtEnd: new Date(Date.parse(evts[ei].end_date)),
                ministry: '', // TODO evts[ei].ministry ? evts[ei].ministry : '',
                location: evts[ei].venue.venue ?? '',
                category: evts[ei].categories.name ?? null,
                imageUrl: evts[ei].slide ?? (evts[ei].image === false ? null : evts[ei].image.url),
                hasSlideImage: !!evts[ei].slide
            };
            newEventList.push(evtObj)
        }

        featuredEventList = newEventList;

        if (currentSlide === null)
            changeSlide();
    }

    function allCallback(error, response, body) {
        let evts = JSON.parse(body),
            newEventList = [],
            now = new Date(),
            later = (new Date()).addHours(24);

        for (let ei in evts) {
            if (!evts.hasOwnProperty(ei))
                continue;

            if (!evts[ei].hasOwnProperty('title'))
                continue;

            let evtObj = {
                title: evts[ei].title,
                dtStart: new Date(Date.parse(evts[ei].start)),
                dtEnd: new Date(Date.parse(evts[ei].end)),
                ministry: evts[ei].ministry ? evts[ei].ministry : '',
                location: evts[ei].location,
                diff: null
            };

            evtObj.diff = now.compareTo(evtObj.dtStart); // -1 if starts in the future.

            if (now.compareTo(evtObj.dtEnd) > 0)
                continue;

            if (later.compareTo(evtObj.dtStart) < 0)
                continue;

            newEventList.push(evtObj)
        }

        currentEventList = newEventList;
    }
}
updateEventLists();


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
            event = featuredEventList[nextEventToSlideify++];
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

                event = featuredEventList[++nextEventToSlideify];
                event.tense = getTense(event);
            }
            nextEventToSlideify--;

            html += "</table></div>";
            nextSlide.innerHTML = html;

        // This Sunday
        } else if (event.dtStart.format('D') === 'Sun' && Date.today().getWeek() === event.dtStart.getWeek()) {
            nextSlide.time = 1500;
            nextSlide.classList.add('thisSunday');
            let count = 0;
            let html = "";

            if (Date.today().format('D') === "Sun")
                html += "<div><h2>Events Today</h2><table>";
            else
                html += "<div><h2>Events This Sunday</h2><table>";

            /** @var Date event.dtStart */
            while (event.dtStart.format('D') === 'Sun' && Date.today().getWeek() === event.dtStart.getWeek() && count++ < 7) {
                html += "<tr><td class='right'>" + event.dtStart.toTimeStringFormatted() + "</td><td>" + event.title + "</td><td>" + event.location + "</td></tr>";

                nextSlide.time += 750;

                event = featuredEventList[++nextEventToSlideify];
            }
            nextEventToSlideify--;

            html += "</table></div>";
            nextSlide.innerHTML = html;

        // Everything else
        } else {
            console.log(event);

            if (event.hasOwnProperty('hasSlideImage') && event.hasSlideImage !== true) {
                nextSlide.innerHTML = "<div><h2>" + event.title + "</h2><p>" + event.dtStart.toDateStringFormatted() + " &sdot; " + event.dtStart.toTimeStringFormatted() + "</p><p>" + event.location + "</p><p class='ministry'>" + event.ministry + "</p></div>";
            } else {
                nextSlide.innerHTML = "";
            }
            nextSlide.classList.add('single');
            nextSlide.time = 4000;

            if (event.hasOwnProperty('imageUrl') && event.imageUrl !== null)
                nextSlide.style.backgroundImage = "url('" + event.imageUrl + "')";
        }
    }

    nextEventToSlideify++;
    if (nextEventToSlideify >= featuredEventList.length) {
        updateEventLists();
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
