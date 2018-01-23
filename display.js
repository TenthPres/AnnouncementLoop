const request = require('request');
const DomParser = require('dom-parser');
require('datejs');

let eventList = [],
    nextEventToSlideify = -1,
    previousSlide = null,
    currentSlide = null,
    nextSlide = null;

function updateEventList() {
    const d = new Date();
    const d1 = d.format('%b+d%2C+%Y');
    const d2 = d.addDays(15).format('%b+d%2C+%Y');

    request('https://nocache.tenth.org/events?start_date=' + d1 + '&end_date=' + d2, fromRequest);

    function fromRequest(error, response, body) {
        const parser = new DomParser();
        let bodyDom = parser.parseFromString(body),
            table = bodyDom.getElementsByClassName('events-table')[0],
            date,
            newEventList = [],
            alreadyIncludedSlugs = [];

        for (let ri in table.childNodes) {
            switch (table.childNodes[ri].nodeName) {
                case 'thead':
                    date = table.childNodes[ri].childNodes[1].textContent + " 2018"; // TODO figure out a way to deduce the year.
                    break;

                case 'tbody':
                    for (let ei in table.childNodes[ri].childNodes) {
                        if (table.childNodes[ri].childNodes[ei].nodeName !== 'tr')
                            continue;

                        let row = table.childNodes[ri].childNodes[ei].getElementsByTagName('td'),
                            link = row[1].childNodes[1].getAttribute('href');

                        if (alreadyIncludedSlugs.indexOf(link) >= 0)
                            continue;

                        alreadyIncludedSlugs.push(link);

                        let time = row[0].textContent.trim(),
                            title = row[1].textContent.trim(),
                            ministry = row[2].textContent.trim(),
                            location = row[3].textContent.trim();

                        if (location === '' || location === 'Tenth Presbyterian Church')
                            continue;

                        time = new Date(Date.parse(date + ", " + time + " EST"));

                        let evtObj = {
                            title: title,
                            dtStart: time,
                            dtEnd: time.clone().addMinutes(90),
                            ministry: ministry,
                            location: location,
                            link: link,
                            img: null
                        };
                        const _date = date;

                        request('https://nocache.tenth.org' + evtObj.link, function(error, response, body) {
                            let detailDom = parser.parseFromString(body),
                                imgHolder = detailDom.getElementsByClassName('resource-promo-image'),
                                schedule = detailDom.getElementsByClassName('schedule');

                            if (imgHolder.length > 0)
                                evtObj.img = imgHolder[0].childNodes[1].getAttribute('src');

                            if (schedule.length > 0) {
                                evtObj.dtEnd = new Date(Date.parse(_date + ", " + schedule[0].childNodes[6].textContent.trim() + " EST"));
                            }
                        });

                        newEventList.push(evtObj);
                    }
                    break;
            }
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
        nextSlide.time = 8000;
        let _slide = nextSlide;
        nextSlide.onShow = function() {
            _slide.style.backgroundPositionY = "0";
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
        } else if (event.dtStart.format('D') === 'Sun' && Date.today().getWeek() === event.dtStart.getWeek()) {
            nextSlide.time = 1500;
            nextSlide.classList.add('thisSunday');
            let count = 0;
            let html = "";

            if (Date.today().format('D') === "Sun")
                html += "<div><h2>Events Today</h2><table>";
            else
                html += "<div><h2>Events This Sunday</h2><table>";

            while (event.dtStart.format('D') === 'Sun' && Date.today().getWeek() === event.dtStart.getWeek() && count++ < 7) {
                html += "<tr><td class='right'>" + event.dtStart.toTimeStringFormatted() + "</td><td>" + event.title + "</td><td>" + event.location + "</td></tr>";

                nextSlide.time += 750;

                event = eventList[++nextEventToSlideify];
            }
            nextEventToSlideify--;

            html += "</table></div>";
            nextSlide.innerHTML = html;

        // Everything else
        } else {
            nextSlide.innerHTML = "<div><h2>" + event.title + "</h2><p>" + event.dtStart.toDateStringFormatted() + " &sdot; " + event.dtStart.toTimeStringFormatted() + "</p><p>" + event.location + "</p><p class='ministry'>" + event.ministry + "</p></div>";
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

Date.prototype.toDateStringFormatted = function() {
    /* Today */
    if (this.isToday()) {
        if (parseInt(this.format('G')) >= 17) { // 5pm or later
            return "Tonight";
        } else {
            return "Today";
        }
    }

    console.log(this.getTime() - Date.today().getTime());

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
    let string = this.format('%r');

    if (string[0] === '0')
        string = string.substr(1);

    string = string.replace(' ', '').toLowerCase();

    return string;
};

