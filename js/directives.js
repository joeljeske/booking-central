'use strict';


angular.module('bookingCentral.directives', []).

	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Booking 
	//
	directive('booking', function(version) {
		return {
		    restrict: 'E',
		    template: "<div " +
		    			"ng-hide='day.id == null' " +
		    			"ng-class='{past: day.tense < 0, present: day.tense == 0, future: day.tense > 0}' " +
		    			"ng-click='open(day.id);' " +
		    			"ng-bind='day.name'>" +
		    		  "</div>",
		    replace: true,
//		    priority: 0,
//		    transclude: false,
//		    scope: false,
//		    terminal: false,
//		    require: false,
//		    controller: function($scope, $element, $attrs, $transclude, otherInjectables) { ... },
			compile: function compile(tElement, tAttrs, transclude) {
				return {
	//		        pre: function preLink(scope, iElement, iAttrs, controller) { ... },
					post: function postLink(scope, iElement, iAttrs, controller) { 

						iElement.draggable({
							axis: 'y',
							grid: [iElement.parent().width(), 21],
							helper: function(){
								var oldBooking = angular.element(this);
								var newBooking = oldBooking.clone();
								var offset = oldBooking.offset();
								newBooking.css({
									position: "absolute",
									top: offset.top,
									left: offset.left - 10,
									width: oldBooking.width()
								});
								return newBooking;
							},
							start: function(event, ui){
								iElement.hide();	
							},
							stop: function(event, ui){
								iElement.show();
								/*
								var el = $(this);
								$scope.$apply(function(){
									var diff = {
										x: ui.position.left - ui.originalPosition.left,
										y: ui.position.top  - ui.originalPosition.top,
									}
									
									//number of spots up
									var rows = diff.y / 21;
									controller.moveResource(rows);
									console.log(ui);									
								});
								*/
							}
						});
					}
				};
	   		}
//		    link: function postLink(scope, iElement, iAttrs) { ... }
		};
	}).
	
	
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	directive('jjSticky', ["$window", function($window) {
		return {
		    restrict: 'A',
		    replace: false,
			link: function link(scope, el, attrs) { 
				var elTop = el.offset().top;
				var win = angular.element($window);
				
				win.scroll(function() {
                	el.toggleClass('sticky', win.scrollTop() > elTop);
				});
				
			}
		};
	}]);