'use strict';

///////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////
// File: services.js
// Module: bookingCentral.services
//
// (c) Joel Jeske 2014
// 
///////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////
angular.module('bookingCentral.services', ["sforceRemoting", "btford.modal"]).
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Simple verion string
	//
	value('version', '0.0.1b').
	
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Configure the sforceRemoting for our specific purposes
	//
	config(["salesforceProvider", function(salesforceProvider) {
        salesforceProvider.escape(false);
        salesforceProvider.setTimeout(30000);
        salesforceProvider.useBuffer(true);
    }]).
    
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Range Class
    //
    factory("Range", function(){
		var Range = function(start, stop, period){
			//Set a private variable for start as an XDate
			this.__start = new XDate(start ? start : 1);

			//Set a private variable for stop as an XDate
			this.__stop = new XDate(stop ? stop : 1);
			
			//If there is not a end date but a period, set the end date as the start date + number of days in period
			if(period && !stop) this.__stop = new XDate(this.__start).addDays(period);
			
			//Make a function to reset the period to the current day
			this.today = function(){
				this.__start.setTime(XDate.today().getTime());
			}
		
			//Make a range shifter by day
			this.addDays = function(d){
				if(typeof d === "number"){
					this.__start.addDays(d);
					this.__stop.addDays(d);
				}
			}
				
			//Make a range shifter by weeks
			this.addWeeks = function(w){
				if(typeof w === "number"){
					//7 days in a week
					this.addDays(w * 7);
				}
			}
			
			//Make a range shifter by months
			this.addMonths = function(m){
				if(typeof m === "number"){
					this.__start.addMonths(m);
					this.__stop.addMonths(m);
				}
			}
		}
		
		var r = Range.prototype;

		Object.defineProperty(r, "startPretty", {
			get: function( ) { return this.__start.toString('MMMM dd, yyyy') },
			set: function(s) { this.__start.setTime(new XDate(s).getTime()); }
		});   
				
		Object.defineProperty(r, "start", {
			get: function( ) { return this.__start },
			set: function(s) { this.__start.setTime(new XDate(s).getTime()); }
		});   
		
		Object.defineProperty(r, "stopPretty", {
			get: function( ) { return this.__stop.toString('MMMM dd, yyyy') },
			set: function(e) { this.__stop.setTime(new XDate(e).getTime()); }
		});   
					
		Object.defineProperty(r, "stop", {
			get: function( ) { return this.__stop },
			set: function(e) { this.__stop.setTime(new XDate(e).getTime()); }
		}); 
		
		Object.defineProperty(r, "period", {
			get: function( ) { return this.__start.diffDays(this.__stop) },
			set: function(p) { this.__stop.setTime(new XDate(this.__start).addDays(p).getTime()); }
		}); 
		
		
		//Return this object as our class to be new'd
		return Range;
				
    }).
	
	
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Data manager
	//
	// The goal of this service is to ask it for a date range and it would request the data from the 
	// salesforce remoting module. It would format the data as expected by the requester (probably a 
	// controller). 
	service("bookingsDataManager", ["salesforce", "buildingNormalizer", "$q", function(sf, normalizer, $q){
		//Default all the api functions to 'this'
		angular.extend(this, sf);

		
		//There is no need for a wrapper for this ajax service
		this.getDetailedBooking = function(id){	
			return sf.getDetailedBooking(id)
			.then(function(booking){
				booking.checkin  = new Date(booking.Checkin__c ); 
				booking.checkout = new Date(booking.Checkout__c);		
				return booking;		
			});
		}
		
		this.create = function(booking, resources){
			return sf.create(booking, resources).then(function(result){
				if(result && result.length)
					return $q.reject(result);
			});
		}
		
		//Cache booking data
		var __bookingsData;	
			
		//Function to get bookings formatted properly for the given date range
		this.getBookings = function(start, end, resourceIds){
			//Are we doing a partial fetch or a full fetch for only some resources
			var partialFetch = __bookingsData && Array.isArray(resourceIds) && resourceIds.length;
			
			var startStr = start.toUTCString();
			var endStr = end.toUTCString();
			
			//Pass an empty array for a partial fetch
			var promise = sf.getBookings(startStr, endStr, partialFetch ? resourceIds : []);

			if(partialFetch)
			{
				//Return a sequential promise;
				promise = promise.then(function(result){
					
					//Loop through all the buildings
					angular.forEach(result, function(building){
						//Loop through all the resources
						angular.forEach(building.resources, function(resource){
							//Get the old resource to simply replace data
							var oldResource = __bookingsData.resources[resource.id];
							//Normalize the new resource just fetched
							normalizer(resource, start, end, __bookingsData.bookings);
							//This overwrites the old data with a pointer to the new data
							angular.extend(oldResource, resource);
						});
					});
					
					return __bookingsData;
				});
			}
			else
			{
				//Return a sequential promise;
				promise = promise.then(function(result){
					//Reset cache variable. We are doing a full fetch
					__bookingsData = {
						bookings: {},      //Booking ID -> Booking
						resources: {},     //Resource ID -> Resource
						buildings: result  //Array of Buildings
					};
					
					//Loop through all the buildings and normalize the resources
					angular.forEach(__bookingsData.buildings, function(building){
						angular.forEach(building.resources, function(resource){
							//Normalize the resources for this building
							normalizer(resource, start, end, __bookingsData.bookings);
							//Add a quick lookup
							__bookingsData.resources[resource.id] = resource;
						});
					});
	
					return __bookingsData;
				});
			}
			
			return promise;
		}
		
		this.moveBooking = function(b,r){
			return sf.moveBooking(b,r).then(function(result){
				if(result === true)
					return true;
				else 
					return $q.reject();
			});	
		}
		
		//Cached options
		var __statusOptions;
		this.statusOptions = function(){
			if(__statusOptions && __statusOptions.length) //There is a cached option
			{
				 var defer = $q.defer();
				 defer.resolve(__statusOptions);
				 return defer.promise;
			}
			else
			{
				var promise = sf.statusOptions();
				promise.then(function(r){ __statusOptions = r;}); //Cache result
				return promise;	
			}
		}
	}]).


	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	// 
	//
	service("buildingNormalizer", [function(){
		// Helper Classes 
		
		//Called with the XDate object of the date to make an empty booking
		function EmptyBooking(current){
			this.weekend = current.isWeekend();
			this.old = current.isBefore(XDate.today());
			this.nights = 1;
		}//EmptyBooking Class
		
		//Called with the booking object, the start and end dates of the period
		function Booking(b, start, end){
			b.nights = XDate.max(start, b.checkin).diffDays(XDate.min(end, b.checkout));
			b.weekend = false; //It might be a weekend but it will have color of its own			
		}//Booking Class
			

		//Function to return
		var normalizer = function(resource, start, end, bookingsMap){
			//Will hold the array of days  
			var days = [];	
			var addDay = (function(){
				var count = 0;
				return function(d){
					d.number = count;
					count += d.nights;
					days.push(d);
				}
			})();
			
			//Get the start time in our period
			var counter = new XDate(start);
			
			angular.forEach(resource.bookings, function(booking){
				//Validate booking's dates
				booking.checkin  = new XDate(booking.checkin  ? booking.checkin  : 1).clearTime();
				booking.checkout = new XDate(booking.checkout ? booking.checkout : 1).clearTime();

				//Provide a pointer to the parent resource
				booking.resource = resource;
			
				//Skip the number of days before the booking
				//Whichever is smaller, the number of days from now until the next booking or until the end of the period
				var numEmptyBookings = Math.min(counter.diffDays(booking.checkin), counter.diffDays(end));
				
				for(var l = 0; l < numEmptyBookings; l++)
				{
					addDay(new EmptyBooking(counter));
					counter.addDays(1);
				}

				//Add the booking to the list
				Booking(booking, start, end);
				addDay(booking);
				
				//Add the booking to the hash map for lookup by ID.
				bookingsMap[booking.id] = booking;
				
				//Skip the number of days until the booking ends but don't make more empty bookings
				 counter.addDays(booking.nights);

			});//For each booking

	
			//while counter is before end of range
			for(;counter.isBefore(end); counter.addDays(1))
				addDay(new EmptyBooking(counter));
											
			//Assign the list of day bookings to our resource object for our model to iterate over	
			resource.days = days;
		}
		
		//Return our function
		return normalizer;
	}]).
	
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Calendar-Creator 
	// takes a Start
	//
	service("calendarCreator", function(){
		
		var calendarCreator = function(start, stop, format){
			
			//Calendar holder
			var cal = [];
			
			var today = XDate.today().getTime();
			
			//Loop through every day in this range
			for(var c = new XDate(start).clearTime(); c.isBefore(stop); c.addDays(1))
			{
				//Will hold formatted strings for every day
				var day = {};
				
				//Loop over every type of formatting requested
				for(var name in format)
				{
					//Add this format for the day to the calendar type
					day[name] = c.toString(format[name]);
				}
				
				//Set if date is the current day.
				day.today = c.getTime() == today;
				
				//Add this day to the calendar
				cal.push(day);
			}
			
			return cal;
		}
		
		//Return this function
		return calendarCreator;
	}).
	
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	factory("modal", ["btfModal", function(btfModal){

        return {
	        view: btfModal({
	            controller: "viewModalCtrl",
	            controllerAs: "viewModalCtrl",
	            templateUrl: "/resource/1397601890000/modalTemplate",
	        }),
		    
		    create: btfModal({
	            controller: "createModalCtrl",
	            controllerAs: "createModalCtrl",
	            templateUrl: "/resource/1398577356000/createBookingModal",
	        }),
	        
	        changeStatus: btfModal({
	            controller: "changeStatusModalCtrl",
	            controllerAs: "changeStatusModalCtrl",
	            templateUrl: "/resource/1398546842000/changeStatusModal",
	        })
       };
	    
    }]).
    
 
	
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Use the tabOpener function to use a single tab or window to open pages from the same origin. 
	// Factory reference so it will use the same tab in various places in the app.
	//
	factory("tabOpener", function(){
		//Private variable that points to a js window object in a separate tab 
		var w;	
		
		//return a function handle for our open function. 
		//Pass in a string of the path of our new window
		return function(p){
			var u = window.top.location.origin + p;
			if(w)
				w.location = u;
			else
				w = window.top.open(u, '_blank');
		};
	});	
		
