function initializeMap() {
  function autocompleteStartLocation() {
    var dest = document.getElementById('destField');
    var autocomplete = new google.maps.places.Autocomplete(dest);
  }

  function autocompleteDestination() {
    var initial = document.getElementById('initField');
    var autocomplete = new google.maps.places.Autocomplete(initial);
  }

  google.maps.event.addDomListener(window, 'load', autocompleteStartLocation);
  google.maps.event.addDomListener(window, 'load', autocompleteDestination);
}

$(document).ready(function () {

  var startLat = "";
  var startLong = "";
  var destLat = "";
  var destLong = "";

  //Google maps api to validate address and get lat/long

  function checkPrice(dest, initial) {
    // Get geocoder instance
    var geocoder = new google.maps.Geocoder();
    // Geocode the address
    geocoder.geocode({
      'address': dest.value
    }, function (results, status) {
      if (status === google.maps.GeocoderStatus.OK && results.length > 0) {

        destLat = results[0].geometry.location.lat();
        destLong = results[0].geometry.location.lng();
        geocoder.geocode({
          'address': initial.value
        }, startLocationResults);
        // show an error if it's not
      } else {
        alert("Error with destination field! Please try again and make sure the address is valid!");
        console.log(status);
        console.log(results);
      }
    });

  }

  function comparePrices() {
    //Ajax request to search with current location data. Callback is success function that displays results
    $.ajax({
      method: 'POST',
      url: "search",
      type: 'json',
      data: {
        startLatitude: startLat,
        startLongitude: startLong,
        endLatitude: destLat,
        endLongitude: destLong
      },
      success: showResults
    });
  }

  //credit to http://stackoverflow.com/questions/1726630/formatting-a-number-with-exactly-two-decimals-in-javascript
  function round2Fixed(value) {
    value = +value;

    if (isNaN(value)) {
      return NaN;
    }

    // Shift
    value = value.toString().split('e');
    value = Math.round(+(value[0] + 'e' + (value[1] ? (+value[1] + 2) : 2)));

    // Shift back
    value = value.toString().split('e');
    return (+(value[0] + 'e' + (value[1] ? (+value[1] - 2) : -2))).toFixed(2);
  }

  function parseLyft(lyftResults, lyftMin) {
    var high_price = parseInt(lyftResults["estimated_cost_cents_max"]);
    var low_price = parseInt(lyftResults["estimated_cost_cents_min"]);
    //divide by 200 because in cents
    var average_price = round2Fixed((high_price + low_price) / 200);

    $('#lyftPrice').append(lyftResults["display_name"] + ": " + "$" + average_price + "<br>");
    if (parseFloat(lyftMin) > parseFloat(average_price)) {
      //exact cost by Lyft
      if (high_price == low_price) {
        $('#lyftBest').text('The cheapest lyft is ' + lyftResults["display_name"] + ' which costs  $' + (low_price / 100).toFixed(2));
      } else {
        //Say about because it's variable
        $('#lyftBest').text('The cheapest lyft is ' + lyftResults["display_name"] + ' which costs between $' + (low_price / 100).toFixed(2) + ' and $' + (high_price / 100).toFixed(2));
      }
      return average_price;
    }
    return lyftMin;
  }

  function showResults(data, code, jqXHR) {
    $('.spinner').css('display', 'none');

    var uberPrices = {};
    //Retreive specific prices by service
    var uberResults = data["results"]["uber"];
    var lyftResults = data["results"]["lyft"][0];
    var lineResults = data["results"]["lyft_line"][0];
    var plusResults = data["results"]["lyft_plus"][0];
    /*Show two columns and new title*/
    $('.choose').css('display', 'block');

    $('.columns').css('display', 'block');

    var uber_min = 1000000000;

    for (var i = 0; i < uberResults.length; i++) {
      //This simply gets the price, converts it to dollars and then displays it
      var high_price = parseInt(uberResults[i]["high_estimate"]);
      var low_price = parseInt(uberResults[i]["low_estimate"]);
      var average_price = round2Fixed((high_price + low_price) / 2);
      uberPrices[uberResults[i]["display_name"]] = average_price;
      $('#uberPrice').append(uberResults[i]["display_name"] + ": " + "$" + average_price + "<br>");
      //find lowest price
      if (parseFloat(average_price) < parseFloat(uber_min)) {
        uber_min = average_price;
      }
    }

    //This is bad coding, TODO fix it. Both hacky to get the name right and reiterating over an array :shudder:
    for (var i = uberResults.length - 1; i >= 0; i--) {
      //reiterate over array BACKWARDS so that the cheapest uber isn't Nav or Espanol (as they are usually the same price as the cheapest)
      var high_price = parseInt(uberResults[i]["high_estimate"]);
      var low_price = parseInt(uberResults[i]["low_estimate"]);
      var average_price = round2Fixed((high_price + low_price) / 2);
      if (parseInt(average_price) == parseInt(uber_min)) {
        $('#uberBest').text('The cheapest uber is ' + uberResults[i]["display_name"] + ' which costs between $' + low_price + ' and $' + high_price);
      }
    }

    var lyft_min = 100000000;
    lyft_min = parseLyft(lyftResults, lyft_min);
    lyft_min = parseLyft(lineResults, lyft_min);
    lyft_min = parseLyft(plusResults, lyft_min);

    if (parseFloat(lyft_min) < parseFloat(uber_min)) {
      $('#title').text('Lyft is cheaper! It costs about $' + lyft_min);
    } else if (lyft_min == uber_min) {
      $('#title').text('They are about the same price! They cost $' + uber_min);
    } else {
      $('#title').text('Uber is cheaper! It costs about $' + uber_min);
    }

  }

  function startLocationResults(results, status) {
    if (status === google.maps.GeocoderStatus.OK && results.length > 0) {
      startLat = results[0].geometry.location.lat();
      startLong = results[0].geometry.location.lng();
      //Only get here after valid destination, so ok to call compare prices
      comparePrices();
      // show an error if it's not
    } else {
      alert("Error with initial location field! Please try again and make sure the address is valid!");
      console.log(status);
      console.log(results);
    }
  }

  //On click for search button
  $('#search').click(function () {
    $('.spinner').css('display', 'inline-table');
    var dest = document.getElementById('destField');
    var initial = document.getElementById('initField');
    if (dest.value == "" || initial.value == "") {
      alert("Location values must be set!");
    } else {
      checkPrice(dest, initial);
    }
  });

});