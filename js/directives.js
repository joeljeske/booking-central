'use strict';


angular.module('bookingCentral.directives', []).
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	//Selectable create booking
	//
	directive('selectableCreateBooking', ["$parse", function($parse) {
		return {
		    restrict: 'A',
			link: function link(scope, el, attrs) { 
				var selected;	
				el.selectable({
					cancel: 'td.resource-name, td.inactive',
					filter: 'td.booking.empty:not(.inactive)',
					start: function(event, ui){
						selected = [];	
					},
					selected: function(event, ui){
						selected.push(ui.selected);
					},
					stop: function(event, ui){
						var $selected = angular.element(selected);
						//Reset the current selection 	
						selected = [];
						var start_day = parseInt($selected.first().attr('data-column'));
						var end_day = parseInt($selected.last().attr('data-column'));
						var resourceId = $selected.first().closest('tr.resource').attr('data-resource-id');
						
						var promise = scope.create(start_day, end_day, resourceId);
						promise.finally(function(){
							//Deselect all the selected items
							$selected.removeClass('ui-selected').removeClass('ui-selectee');
						})
					}
				});
	   		}
		};
	}]).

	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Booking 
	//
	directive('booking', function(version) {
		return {
		    restrict: 'E',
		    template: "<div " +
		    			"class='booking-draggable' " +
		    			"data-booking-id='{{day.id}}' " +
		    			"ng-hide='day.id == null' " +
		    			"ng-class='{past: day.tense < 0, present: day.tense == 0, future: day.tense > 0, moving: day.moving}' " +
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
							cancel: '.past',
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
							}
						});
					}
				};
	   		}
		};
	}).
	
	directive('targetMoveBooking', ["$parse", function($parse) {
		return {
		    restrict: 'A',
			compile: function compile(tElement, tAttrs, transclude) {
				return {
					post: function postLink(scope, iElement, iAttrs, controller) { 
						var bookingId = scope.$eval(iAttrs.targetMoveBooking);
						
						if(typeof bookingId !== "string")
						{
							iElement.droppable({
								accept: ".booking-draggable",
								drop: function(event, ui){
									if(confirm('Are you sure you want to move this booking?'))
									{
										var resourceId = angular.element(this).closest('tr.resource').attr('data-resource-id');
										var bookingId = ui.draggable.attr('data-booking-id');
										scope.move(bookingId, resourceId);
									}
								}
							});
						}
					}
				};
	   		}
		};
	}]).

		
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	// jjDateRange
	//
	// This directive creates two input boxes for use with jQuery UI Datepickers. This is used on the main 
	// header title to change the range for booking lookup. 
	//
	directive('jjDateRange', function() {
		return {
		    restrict: 'E',
		    replace: true,
			template: '<div class="jj-date-range">'+
					'<label for="start_range">From</label>'+
					'<input type="text" id="start_range" readonly="readonly" size="{{range.startPretty.length}}" ng-model="range.startPretty" />' +
					'<label for="end_range">to </label>'+
					'<input type="text" id="end_range" readonly="readonly" size="{{range.stopPretty.length}}" ng-model="range.stopPretty" /></div>',
		    
			link: function link(scope, el, attrs) { 
				el.find("#start_range").datepicker({
			      defaultDate: "+1w",
			      numberOfMonths: 1,
			      dateFormat: "MM d, yy",
			      onClose: function( selectedDate ) {
			        el.find("#end_range").datepicker( "option", "minDate", selectedDate );
			      }
			    });

			    el.find("#end_range").datepicker({
			      defaultDate: "+1w",
			      numberOfMonths: 1,
			      dateFormat: "MM d, yy",			      
			      onClose: function( selectedDate ) {
			        el.find("#start_range").datepicker( "option", "maxDate", selectedDate );
			      }
			    });			
			}
		};
	}).
	

	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	// jjDatePicker
	// This directive simply attaches the basic ui 
	//
	directive('jjDatePicker', ["$parse", function($parse) {
		return {
		    restrict: 'A',
			link: function link(scope, el, attrs) { 
				var defaults = {}
				var opts = scope.$eval(attrs.jjDatePicker);
				angular.extend(defaults, opts)
				el.datepicker(defaults);
			}
		};
	}]).
	
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	// jjDatePicker
	// This directive simply attaches the basic ui 
	//
	directive('jjDraggable', function() {
		return {
		    restrict: 'A',
			link: function link(scope, el, attrs) { 
				el.draggable({
	            	handle: attrs.jjDraggable,
					cursor: "move",
	        	});
			}
		};
	}).
	
	
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	// jjSticky
	//
	// This directive applies the CSS class 'sticky' when the window scrolls past the top of this element.
	// 
	directive('jjSticky', ["$window", function($window) {
		return {
		    restrict: 'A',
		    replace: false,
			link: function link(scope, el, attrs) { 
				var elTop = el.offset().top;
				var win = angular.element($window);
				var $buffer = angular.element('<div></div>');
				
				$buffer.css({
					height: el.css('height'),
					width: el.css('width'),
					display: 'none'
				});
				
				el.after($buffer);
				
				win.scroll(function() {
					var shouldToggle = win.scrollTop() > elTop;
                	el.toggleClass('sticky', shouldToggle);
                	
                	shouldToggle ? $buffer.show() : $buffer.hide();
                	
				});	
			}
		};
	}]);