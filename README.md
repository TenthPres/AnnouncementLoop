# Announcement Loop

This is an [Electron](https://electronjs.org/) App designed to advertise upcoming events on TVs around our church.  The 
listings (text and images) are pulled from [our website](https://www.tenth.org/events), and update automatically.  

## If you want this for your own church...

You're welcome to steal our code.  Hopefully this is obvious, but please don't abuse our name or branding.  As 
elaborated in the license, the our code does not come with any sort of warranty or endorsement.  

Editing this code to be able to read info off your church website will require some Javascript skills.  

If you need help (within reason) or want to let us know about something awesome you've done, feel free to 
[email the tech committee](mailto:techcmte@tenth.org).  

You will also need to replace the welcome "slide" and static images. 

To clone and install the dependencies: (you'll need [git](https://git-scm.com) and [node/npm](https://nodejs.org))

	git clone https://github.com/TenthPres/AnnouncementLoop.git
	cd AnnouncementLoop
	npm install

## Developing and Building

We stole the build commands from various Electron sample apps, and, although we've kept the commands for building Mac 
and Linux versions, we've only ever built for Windows, as that's the only platform we're currently using.  If you need 
another platform, it should be relatively straight forward to get that going. 

To run: 

	npm start
	
To run with the Electron Debugger attached to the window:

	npm run dev
	
To build: (builds are put into the aptly-named 'build' directory)

	npm run build
	
