"use strict";

const {app, BrowserWindow, ipcMain, Notification} = require("electron");
const {autoUpdater} = require("electron-updater");

var express = require('express');
var exp = express();
var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var isDev = require('electron-is-dev');

var mainWindow = null;
var logWindow = null;

app.setAppUserModelId('pro.checkmeout.desktop');

app.on('window-all-closed', function() {
	if (process.platform != 'darwin')
		app.quit();
});

app.on('ready', function() {
	// if (isDev) {
	// 	mainWindow = new BrowserWindow({
	// 		width: 1280, 
	// 		height: 800,
	// 		backgroundColor: '#f8f8f8',
	// 		frame: true,
	// 		show: false
	// 	});

	// 	mainWindow.loadURL('file://' + __dirname + '/views/preload.html');
	// }
	// else {
	// 	mainWindow = new BrowserWindow({
	// 		width: 1280, 
	// 		height: 800,
	// 		backgroundColor: '#f8f8f8',
	// 		frame: false,
	// 		show: false
	// 	});

	// 	mainWindow.loadURL('file://' + __dirname + '/views/root.html');
	// }

	mainWindow = new BrowserWindow({
	 	width: 1280, 
	 	height: 800,
		backgroundColor: '#f8f8f8',
	 	frame: true,
	 	show: false
	 });

 	mainWindow.loadURL('file://' + __dirname + '/views/preload.html');

	mainWindow.once('ready-to-show', () => {
		mainWindow.show();
	});

	// mainWindow.setMenu(null);

	mainWindow.on('closed', function() {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null;
	});

	// wait for everything to be initialised
	setTimeout(() => {
		if (!isDev) {
			mainWindow.webContents.send('message', 'checking-for-updates');
			autoUpdater.checkForUpdates();
		}
	}, 5000);
});

// check for updates

ipcMain.on('check-for-updates', () => {
	mainWindow.webContents.send('message', 'checking-for-updates');
	autoUpdater.checkForUpdates();
})

// auto updater

autoUpdater.on('update-available', (ev, info) => {
	mainWindow.webContents.send('message', 'update-available');
});
autoUpdater.on('error', (ev, err) => {
	mainWindow.webContents.send('message', 'update-error');
});
autoUpdater.on('download-progress', (ev, progressObj) => {
	mainWindow.webContents.send('message', 'download-progress');
});
autoUpdater.on('update-downloaded', (ev, info) => {
	mainWindow.webContents.send('message', 'update-downloaded');
});

// on receive page source from a browser

ipcMain.on('categoryPageSource', (event, arg) => {
	mainWindow.webContents.send('categoryPageSource', arg);
});

ipcMain.on('productPageSource', (event, arg) => {
	mainWindow.webContents.send('productPageSource', arg);
});

ipcMain.on('checkoutPageSource', (event, arg) => {
	mainWindow.webContents.send('checkoutPageSource', arg);
});

// create log window

ipcMain.on('create', (event, arg) => {
	if (arg == 'logWindow') {
		logWindow = new BrowserWindow({
			width: 500,
			height: 700
		});
		logWindow.loadURL('file://' + __dirname + '/views/log.html');
	}
	else if (arg == 'googleWindow') {
		var googleWindow = new BrowserWindow({
			width: 1000,
			height: 700
		});
		googleWindow.loadURL('http://accounts.google.com/signin');
	}
	else if (arg == 'captchaWindow') {
		var captchaWindow = new BrowserWindow({
			width: 1280,
			height: 700,
			webPreferences: {
				nodeIntegration: false
			}
		});
		captchaWindow.loadURL('https://checkmeout.pro/recaptcha');
	}
	else if (arg == 'keywordWindow') {
		var keywordWindow = new BrowserWindow({
			width: 1100, 
			height: 750
		});
		keywordWindow.loadURL('file://' + __dirname + '/views/keywords.html');
	}
});

// on receive browser status message

ipcMain.on('status', (event, task, status) => {
	logWindow.webContents.send('status', task, status);
});

// get cookies

ipcMain.on('get-cookies', (event) => {
	mainWindow.webContents.session.cookies.get({}, (err, cookies) => {
		mainWindow.webContents.send('cookies', cookies);
	});
});

// restock monitors

var monitors = [];

var Restocks = require('./views/js/monitor.js');

ipcMain.on('start-monitor', (event, arg) => {
	if (arg.proxies.length > 0) {
		var monitor = new Restocks(arg.interval, arg.proxies);
	}
	else {
		var monitor = new Restocks(arg.interval);
	}

	monitor.on('stock-found', (product) => {
		if (arg.size == 'any') {
			mainWindow.webContents.send('stock-found', arg, product);

			var notification = new Notification({
				title: 'Product restocked!',
				body: product.name + ' - ' + product.colour
			}).show();
		}
		else {
			if (product.sizes.indexOf(arg.size) != -1) {
				mainWindow.webContents.send('stock-found', arg, product);

				var notification = new Notification({
					title: 'Product restocked!',
					body: product.name + ' - ' + product.colour + ' - ' + arg.size
				}).show();
			}
		}
	});

	monitor.start(arg.url);

	var monitorObj = {};
	monitorObj.id = arg.id;
	monitorObj.monitor = monitor;

	monitors.push(monitorObj);
});

ipcMain.on('stop-monitor', (event, arg) => {
	var i = monitors.findIndex(x => x.id == arg.id);
	monitors[i].monitor.stop();
	monitors.splice(i, 1);
});

ipcMain.on('get-monitors', (event) => {
	mainWindow.webContents.send('get-monitors', monitors);
});

// keyword items

ipcMain.on('keyword-item', (event, arg) => {
	mainWindow.webContents.send('keyword-item', arg);
});
