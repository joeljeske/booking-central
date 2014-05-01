'use strict';

/* Controllers */

angular.module('bookingCentral.controllers', []).
	controller("tableCtrl", ["$scope","bookingsDataManager", "Range", "calendarCreator", "modal", "$window", "$q", function($scope, manager, Range, calendar, modal, $window, $q){

		//Set an initial range to today + 31 days.
		$scope.range = new Range(XDate.today(), undefined, 30);
		$scope.range.addWeeks(-1);
		
		//Holds a map of all the bookings pointed to by their salesforce id
		var bookings;
		var resources;
		
		//This function gets all the data ready for the view that changes depending on the date or time range
		$scope.updateView = function(resourceIds){
			$scope.loading = true;
			
			manager.getBookings($scope.range.start, $scope.range.stop, resourceIds)
			.then(function(data){
				//Apply our new data to the view model
				$scope.buildings = data.buildings;
				bookings = data.bookings;
				resources = data.resources;
				$scope.loading = false;
			});
			
			$scope.calendar = calendar($scope.range.start, $scope.range.stop, {
				day: "ddd",
				date: "dd"
			});			
		}
		
		//Whenever the range changes in value, run the updateView function
		$scope.$watch("range", function(){ $scope.updateView(); }, true);		

		//Called by the dragged and dropped booking to move the booking to a different room/resource
		$scope.move = function(bid, rid){
			$scope.$apply(function(){
				$scope.loading = true;
				bookings[bid].moving = true;				
			});
			
			//Get the two resource ids in play here, the one changing from and the one chaning to
			var resourceIds = [bookings[bid].resource.id, rid];
			
			manager.moveBooking(bid, rid)
			.then(
			function(){ 
				$scope.updateView(resourceIds); 
			},
			function(){ 
				alert('Cannot move the booking to the requested room.\n\nBookings must have a minimum of 3 hours from checkout to checkin.'); 
				$scope.loading = false;  
				bookings[bid].moving = false;
			});
		}
		
		//
		// Modal Control Methods! 
		//
		
		//Called when a booking is clicked	
		$scope.open = function(bid){
			//Assign the booking to the datasharing service for the modal controller
			//Even if the modal is open, this will update its view to the new booking
			manager.params = {
				booking: bookings[bid]
			};

			//If its not already open			
			if(!modal.view.active())
			{
				//Open the modal 
				modal.view.activate().then(modalCallback);
			}
		}

		$scope.create = function(start_day, end_day, resourceId){
			if(!modal.create.active())
			{
				//Get the checked resources
				manager.params = {
					buildings: $scope.buildings,
				}
				
				//Check the resource that was selected
				if(resourceId)
					resources[resourceId].checkbox = true;
				
				//If we have a specified date range, we will pass it to our modal dialog
				if(typeof start_day === "number" && typeof end_day === "number")
				{
					manager.params.dates = {
						start: new XDate($scope.range.start).addDays(start_day),
						stop: new XDate($scope.range.start).addDays(end_day)
					}
				}	
				
				//Show the modal	
				var promise = modal.create.activate();
				promise.then(modalCallback); //Activate the callback on the creation
				promise.then(function(exitCode){
					for(var i in exitCode.resourceIds)
						resources[exitCode.resourceIds[i]].checkbox = false;
				});
				//Return the promise to the caller
				return promise; 
			}
			
			return $q.reject();
		}
		
		// This method opens the modal for the view booking dialog
		$scope.changeStatus = function(){
			var resources = [];
			angular.forEach($scope.buildings, function(building){
				angular.forEach(building.resources, function(resource){
					if(resource.checkbox)
						resources.push(resource.id);
				});
			});
		
			manager.params = {
				resources: resources
			}

			//If its not already open			
			if(manager.params.resources.length)
			{
				if(!modal.changeStatus.active())
					//Open the modal 
					modal.changeStatus.activate().then(modalCallback);
			} 
			else
			{
				alert('Please select one or more rooms to change their statuses.');
			}
		}	
		
		//Called onclose of modals. If the exit code contains a changes parameter that is true, we need to refresh the view
		function modalCallback(exitCode){
			if(exitCode && exitCode.changes)
			{	
				//If the requester only had small changes that could use the cache, it will pass along the resource ids of those in play. 
				//Otherwise it will do a full refresh by passing no ids
				$scope.updateView(exitCode.cache ? exitCode.resourceIds : undefined);	
			}
		}
		
	}]).
	
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Modal dialog controller
	//
	controller("changeStatusModalCtrl", ["$scope", "modal", "bookingsDataManager", "$window", function($scope, modal, manager, $window){					
		$scope.loading = true;
		
		manager.statusOptions().then(function(statuses){ 
			$scope.statuses = statuses; 	
			$scope.status = statuses[0] || "";
			$scope.loading = false;		
		});			
		
		//Provide a close button
		$scope.closeModal = function(){
			modal.changeStatus.deactivate({ 
				changes: false
			});
		}
		
		$scope.change = function(){
			manager.changeStatus(manager.params.resources, $scope.status).
				then(function(){
					modal.changeStatus.deactivate({
						changes: true,
						chache: true,
						resourceIds: manager.params.resources
					});
				});
		}
		
	}]).
	
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Modal dialog controller
	//
	controller("createModalCtrl", ["$scope", "modal", "bookingsDataManager", "$sce", function($scope, modal, manager, $sce){							
		//Will hold the booking object to be filled on the form
		$scope.Booking__c = {}
		
		if(manager.params.dates)
		{
			$scope.Booking__c.Checkin__c = manager.params.dates.start;
			$scope.Booking__c.Checkout__c = manager.params.dates.stop;
		}
		
		//Holds the list of checked resources
		$scope.buildings = manager.params.buildings; 
		
		//Provide a close button
		$scope.closeModal = function(){
			//Unselect all the resources
			angular.forEach(manager.params.buildings, function(building){
				angular.forEach(building.resources, function(resource){
					resource.checkbox = false;
				});
			});
			
			modal.create.deactivate({changes: false});
		}
		
		//Provide a save button
		$scope.save = function(){
			
			//Make the list of resource ids of the checkboxes
			var resourceIds = [];
			angular.forEach(manager.params.buildings, function(building){
				angular.forEach(building.resources, function(resource){
					if(resource.checkbox)
					{
						resourceIds.push(resource.id);
					}
				});	
			});
			
			//Convert dates to the proper format
			$scope.Booking__c.Checkin__c = new Date($scope.Booking__c.Checkin__c).toISOString();
			$scope.Booking__c.Checkout__c = new Date($scope.Booking__c.Checkout__c).toISOString();

			var bookingJson = JSON.stringify($scope.Booking__c);
			
			$scope.loading = true;
			
			var promise = manager.create(bookingJson, resourceIds)
			
			promise.then(function(result){ 
				modal.create.deactivate({
					changes: true,
					cache: true,
					resourceIds: resourceIds
				});
			},
			function(error){
				$scope.error = $sce.trustAsHtml(error);
				$scope.loading = false;
			}); 
			
			
		}
		
	}]).

	
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Modal dialog controller
	//
	controller("viewModalCtrl", ["$scope", "modal", "bookingsDataManager", "$window", function($scope, modal, manager, $window){
		//Update the view if another booking is selected
		$scope.manager = manager;		
		$scope.$watch("manager.params.booking", updateView);
			
		//Bind the booking data passed by the root controller using the data sharing factory
		//$scope.booking = manager.booking;
		function updateView(){
			$scope.loading = true;
			
			manager.getDetailedBooking(manager.params.booking.id).then(function(response){ 
				$scope.booking = response; 
				$scope.loading = false;				
			});			
		}
		
		//Provide a close button
		$scope.closeModal = function(){
			modal.view.deactivate({changes: false});
		}
		
		//Copy over a salesforce function
		$scope.navigateToUrl = function(url){
			$window.open(url);
		}
			
	}]);
