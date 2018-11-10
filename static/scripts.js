window.onload = function() {
  var $input = $("#datepicker").pickadate();
  var picker = $input.pickadate("picker");
  let minDate = new Date();
  picker.set("min", [
    minDate.getFullYear(),
    minDate.getMonth(),
    minDate.getDate() + 2
  ]);
  //   var today = new Date();
  //   var dd = today.getDate();
  //   var mm = today.getMonth();
  //   var yyyy = today.getFullYear();
};
