var $form = $('form#test-form'),
    url = 'https://script.google.com/macros/s/AKfycbwjSZXRxMQ8EgEiq3Ic0mKmYFFzNzNEWNBxVMld6MAVIYHmxj2u/exec'

$('#submit-form').on('click', function(e) {
  e.preventDefault();
  var jqxhr = $.ajax({
    url: url,
    method: "GET",
    dataType: "json",
    data: $form.serializeObject()
  }).success(
    // do something
  );
})