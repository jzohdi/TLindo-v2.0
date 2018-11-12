window.onload = function() {
  let ele = document.getElementById("datepicker");
  if (ele) {
    var $input = $("#datepicker").pickadate();
    var picker = $input.pickadate("picker");
    let minDate = new Date();
    picker.set("min", [
      minDate.getFullYear(),
      minDate.getMonth(),
      minDate.getDate() + 2
    ]);
    console.log("picker set");
  }
  //   var today = new Date();
  //   var dd = today.getDate();
  //   var mm = today.getMonth();
  //   var yyyy = today.getFullYear();
};

/*
copy text to clipBoard
*/
function copyToClipBoard(textValue) {
  navigator.clipboard.writeText(textValue).then(
    function() {
      alert("Copied to clipboard");
    },
    function() {
      console.log("failed to copy");
    }
  );
}
