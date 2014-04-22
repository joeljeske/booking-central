'use strict';

/* Controllers */

angular.module('bookingCentral.controllers', []).
	controller("tableCtrl", ["$scope","bookingsDataManager", "Range", "calendarCreator", "modal", "$window", function($scope, manager, Range, calendar, modal, $window){

		//Set an initial range to today + 31 days.
		$scope.range = new Range(XDate.today(), undefined, 30);
		$scope.range.addWeeks(-1);
		
		//Holds a map of all the bookings pointed to by their salesforce id
		var bookings;
		
		//This function gets all the data ready for the view that changes depending on the date or time range
		$scope.updateView = function(){
			manager.getBookings($scope.range.start, $scope.range.stop).
				then(function(data){
					//Apply our new data to the view model
					$scope.buildings = data.buildings;
					bookings = data.bookings;
				});
			
			$scope.calendar = calendar($scope.range.start, $scope.range.stop, {
				day: "ddd",
				date: "dd"
			});			
		}
		
		//Whenever the range changes in value, run the updateView function
		$scope.$watch("range", $scope.updateView, true);		
		
		//Called when a booking is clicked
		$scope.open = function(bid){
			//Assign the booking to the datasharing service for the modal controller
			//Even if the modal is open, this will update its view to the new booking
			manager.booking = bookings[bid];

			//If its not already open			
			if(!modal.view.active())
				//Open the modal 
				modal.view.activate();
		}
		
		this.moveBooking = function(){
			
			
		}
		
	}]).
	
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Modal dialog controller
	//
	controller("viewModalCtrl", ["$scope", "modal", "bookingsDataManager", "$window", function($scope, modal, manager, $window){

		$scope.manager = manager;
		
		$scope.$watch("manager.booking", updateView);
			
		//Bind the booking data passed by the root controller using the data sharing factory
		//$scope.booking = manager.booking;
		function updateView(){
			$scope.loading = true;
			
			manager.getDetailedBooking(manager.booking.id).then(function(response){ 
				$scope.booking = response; 
				$scope.loading = false;				
			});			
		}		
		
		//Provide a close button
		$scope.closeModal = function(){
			modal.view.deactivate();
		}
		
		//Copy over a salesforce function
		$scope.navigateToUrl = function(url){
			$window.open(url);
		}
			
	}]);
