if(!Array.isArray) {
  Array.isArray = function(arg) {
    return Object.prototype.toString.call(arg) === '[object Array]';
  };
}

XDate.prototype.isBeforeOrEqual = function(date){
	return this.getTime() <= new XDate(date).getTime();
}

XDate.prototype.isBefore = function(date){
	return this.getTime() < new XDate(date).getTime();
}

XDate.prototype.isAfterOrEqual = function(date){
	return this.getTime() >= new XDate(date).getTime();
}

XDate.prototype.isAfter = function(date){
	return this.getTime() > new XDate(date).getTime();
}

XDate.prototype.isWeekend = function(){
	var day = this.getDay();
	return day == 0 || day == 6;
}

XDate.prototype.isWeekday = function(){
	return !this.isWeekend();
}

XDate.min = function(d1, d2){
	return d1.getTime() < d2.getTime() ? d1 : d2;
}

XDate.max = function(d1, d2){
	return d1.getTime() > d2.getTime() ? d1 : d2;
}

/*
 * This class takes an array of items and iterates through them. 
 * 
 */
function Iterator(array){
	//Confirm a valid array to iterate over
	var __array = Array.isArray(array) ? array : []; 
	//Set a current index to keep track
	var __currentIndex = 0;
	
	//Call and return true if there are no more items in the array. 
	this.isEmpty = function(){
		return __currentIndex - 1 >= __array.length;
	};
	
	//Returns the item currently being looked at but not moving past it. 
	//Returns false if there are no more items in the array
	this.peek = function(){ 
		if(this.isEmpty())
			return false;
			
		return __array[__currentIndex];
	};
	
	//Returns the item currently being looked at and then movss past it. 
	//Returns false if there are no more items in the array
	this.pull = function(){
		if(this.isEmpty())
			return false;
			
		return __array[__currentIndex++];
	};
	
	//Moves to the next item in the array and then returns the item. 
	//Returns false if there are no more items in the array
	this.next = function(){
		if(this.isEmpty() || ++__currentIndex < __array.length)
			return false;
			
		return __array[__currentIndex];		
	};
}