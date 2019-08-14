
const urlEncode = function(paramDictionary) {
    window.history.replaceState({}, "", "?" + encodeURIComponent(JSON.stringify(paramDictionary) ) );
  };
  const MOBILE_MODE = ( window.innerWidth <= 767);
  const paramsToEncode = {}
  if ( sessionStorage.getItem("cart") != undefined ){
    paramsToEncode["cart"] = JSON.parse(sessionStorage.getItem('cart'))
    if ( sessionStorage.getItem("date") != undefined){
      paramsToEncode["date"] = sessionStorage.getItem('date')
    }
    urlEncode(paramsToEncode);
  }
  const urlDecode = function() {
    const urlSearchString = window.location.search;
    if (!urlSearchString.includes("?")) return {};
    try {
      const paramDictionary = JSON.parse(
        decodeURIComponent(urlSearchString.replace("?", ""))
      );
      return paramDictionary;
    } catch {
      window.history.replaceState({}, "", "");
      return {};
    }
  };

  const MAIN_MODAL_CONTENT =
    "<h2> ItemNamePlaceholder: </h2>" +
    "<p> HeaderPlaceholder </p>" +
    "<div class='selection row'> SelectionPlaceholder <div id='addToCart'" +
    "class='col-xs-2 col-xs-offset-8 add-select'>Add to cart</div></div>" +
    '<div class="row modal-add-to-order">namePlaceholder\'s in your cart: </div><div id="idPlaceholder"' +
    ' class="row"></div><div class="button button1" id="done-selection">Done</div>';

  const ADD_MORE_MESSAGE =
    '<span class="tooltiptext">' +
    "Based on your number of people, we recommend the current cart limit. <br/> " +
    "But you can click here to increase the size of your cart!" +
    "</span></div>";

  const AT_ORDER_LIMIT_DIV =
    '<div id="limit-message"style="color: red;" class="col-xs-12 col-sm-10 col-sm-offset-1">' +
    'Currently at order limit <div id="add-more" class="button button1 want-more-button">Want to add to order?' +
    ADD_MORE_MESSAGE +
    "</div>";

  const AT_FLAVOR_LIMIT_DIV =
    '<div style="color: red;" class="col-xs-12 col-sm-10 col-sm-offset-1"> Sorry, you have reached the max number of unique flavors for item</div>';

  const PICK_NUMBER_MORE_ITEMS =
    '<div style="color: red;" class="col-xs-12 col-sm-10 col-sm-offset-1">( Select numberPlaceholder more entrees )</div>';

  // const ITEM_HTML_FOR_LIST =
  //   '<div class="col-xs-12 col-sm-10 col-sm-offset-1"><span class="span increase"  id="appendValuePlaceholder"> ' +
  //   '+ </span> countPlaceholder <span class="span decrease" id="appendValuePlaceholder"> - </span>';
  const ITEM_HTML_FOR_LIST = `<tr><td class='count-column'><span class="span increase" id="appendValuePlaceholder"> + </span> countPlaceholder <span class="span decrease" id="appendValuePlaceholder"> - </span></td>`;

    const DEFAULT_MIN = 8;
    const setAppMaxItems = function(app){
      let numGuests;
      let numAdults = $('#numAdults').val()
      let numKids = $('#numKids').val();

      if( numAdults === '' ) numAdults = 0;
      if( numKids === '') numKids = 0;
      if( isNaN(numAdults) || isNaN(numKids) ){
        app.validGuests = false;
      }else{

        if ( numAdults + numKids === 0 ){
          app.validGuests = false;
          return;
        }

        app.environ.Adults = parseInt(numAdults);
        app.environ.Kids = parseInt(numKids);

        if ( (app.environ.Kids + app.environ.Adults) >= 8 && (0.5*app.environ.Kids + app.environ.Adults) < 8 ){
          numGuests = 8;
        }else{
          numGuests = (0.5*app.environ.Kids) + app.environ.Adults;
        }
        app.maxItems = Math.ceil( numGuests / parseInt(DEFAULT_MIN) );
        const numberRec = $('#number-rec');
        if ( numberRec.html() !== '' ){
          numberRec.html(`For ${app.environ.Adults} adults${ (app.environ.Kids != 0) ? ` and ${app.environ.Kids} kids` : ''}, we recommoned ${app.maxItems} entrees of the smallest size.`) ;
        }
        app.validGuests = true;
      }
    }
    function MenuItem(itemDictionary){
      this.environ = itemDictionary;
      this.notSelectKeys = new Set(["name" , "description", "_id", "type"]);
      this.toLimit = new Set(["Entree", "entree"]);


      this.button = function(){
        if ( !MOBILE_MODE ){
            return `<div id="${this.getId()}"
                  class="entree-item col-xs-10 col-xs-offset-1 entree-options">
                    <h3 style='text-align:left;'>${this.environ.name}</h3>
                    <div>${this.getDescriptionList()}</div>
                  </div>`;
        }
        return `<div id="${this.getId()}"
                  class="entree-item col-xs-12 entree-options">
                    ${this.environ.name}
                </div>`;
      }
      this.getId = function(){
        return this.environ.name.replace(/\s/g,'-').replace("&", "and");
      }
      this.target = function(){
        return "#" + this.environ.type.toLowerCase();
      }
      this.getModalContent = function(help){
        let content =  MAIN_MODAL_CONTENT
        .replace("ItemNamePlaceholder", this.environ.name)
        .replace("HeaderPlaceholder", this.getHeader())
        .replace("SelectionPlaceholder", this.getSelection(help))
        .replace("namePlaceholder", this.environ.name)
        .replace("idPlaceholder", "modal-cart")
        return content
      }
      this.getSelection = function(help){
        let content = ""
        for (const key in this.environ ) {
          if ( this.notSelectKeys.has(key) ){
            continue;
          }
          if (
            this.environ.hasOwnProperty(key) &&
            this.environ[key].length > 1
          ) {
            content += this.getSelectDiv(key, this.environ[key], help);
            }
          }
        return content;
      }

      this.getSelectDiv = function(key, array, help) {
        if ( !typeof(array) ){
          return "";
        }
        key = this.trimKey(key);
        let content = `<div class='col-xs-10 choose-option'> Choose ${key} :  <select class='select-setting'>`
        // if asking for help, and the item is of entree type, and the key is the size. only return option for the smallest size
        if ( help && this.toLimit.has(this.environ.type) && key == 'size'){
          const sizeKey = ( this.environ.hasOwnProperty("sizes") ) ? 'sizes' : 'size';
          const currentLargestSize = Math.min.apply(Math, this.environ[sizeKey].map(function(object) { return object.Count; }))
          const value = this.environ[sizeKey].find( function(object) { return object.Count == currentLargestSize })
          return content + `<option value='${key}'>${value.name.trim()}</option></select></div>`;
        }
        $.each(array, function(index, value) {
          if ( typeof(value) == 'object' && value.hasOwnProperty('name') ){
            value = value.name;
          }
          content += `<option value='${key}'>${value.trim()}</option>`;
        });
        content += "</select></div>";
        return content;
      }
      this.trimKey = function(key) {
        if (key.slice(-1) == "s") {
          key = key.slice(0, -1);
        }
        return key;
      }

      this.getDescriptionList = function(){
        let description = "<ul>";
        if( this.environ.hasOwnProperty("description") ){
          if ( this.environ.description.length > 0 ){
            $.each(this.environ.description, function(index, element) {
              description += `<li>${element}</li>`;
            })
          }
        }
        return description
      }
      this.getHeader = function(){
        if ( MOBILE_MODE ){
          return this.getDescriptionList() + '</ul><p class="please-select-from">Please choose from options:</p>';
        }else{
          return '</ul><p class="please-select-from">Please choose from options:</p>';
        }

      }
    }

    function FoodCounter(cart, app){
      this.cart = cart;
      this.toLimit = new Set(["Entree", "entree"]);
      this.parentApp = app;
      this.possibleSizeKeys = ['size', 'sizes', 'portion', 'portions'];


      this.addItemToCart = function(itemToAdd){
        for ( const itemInCart of this.cart ){
          // if item is the same as another item except for the count, append 1 to the count.
            if ( objectsAreEqual(itemInCart, itemToAdd, ['count'])){
              itemInCart.count = itemInCart.count + 1;
              return;
            }
        }
        this.cart.push(itemToAdd);
      }
      this.getListFromItem = function(itemObject){
        let string = '';
        const keys = Object.keys(itemObject);
        for ( const key of keys ){
          string += "-" + itemObject[key];
        }
        return string;
      }

      this.getHtmlForItem = function( itemObject, index ) {
          const appendValueParams = index.toString();
          let newDiv = ITEM_HTML_FOR_LIST.replace(/appendValuePlaceholder/g, appendValueParams)
          .replace("countPlaceholder", itemObject.count);
          newDiv += `<td>${itemObject.name} ${itemObject.size}</td></tr>`;
          const copyObject = deepCopy(itemObject);
          delete copyObject["name"];
          delete copyObject["size"];
          delete copyObject["count"];
          newDiv += `<tr><td></td><td style="font-size: 13px;">${this.getListFromItem(copyObject)}</td></tr>`;
        // for (const key in itemObject) {
        //   if (key === "cost"){
        //     newDiv += `<small class="my-cart-key" >${itemObject[key]}"</small>,`;
        //   }
        //   else if (key != "count") {
        //     newDiv += `<span class="my-cart-key"> ${itemObject[key]}</span><strong class="order-keys"> | </strong>`;
        //   }
        // }
        // return newDiv + "</div>";
        return newDiv;
      }

      this.toString = function(itemName = null){
        let cartToString = "<table id='cart-table'><tbody>";
        const self = this;
        this.cart.forEach( function(itemInCart, index) {
          if ( !itemName || itemInCart.name == itemName ){
            cartToString += self.getHtmlForItem(itemInCart, index);
          }
        })
        return cartToString + "</tbody></table>";;
      }

      this.canAddItemToCart = function(selectionItemObject, maxFlavors, maxItems, type, help){
        if ( !this.toLimit.has(type) || !this.parentApp.help ){
          return true;
        }
        maxFlavors = Math.min(maxFlavors, maxItems);
        if ( this.alreadyAtMaxFlavorLimit(selectionItemObject, maxFlavors) ){
          return false;
        }else if ( !help ){
          return true;
        }
        const toLimitCount = this.getCountOfItemsToLimit();
        if ( toLimitCount >= maxItems ){
          return false;
        }
        return true;
      }

      this.getAddToCartError = function(selectionItemObject, maxFlavors, maxItems){
        maxFlavors = Math.min(maxFlavors, maxItems);
        if ( this.alreadyAtMaxFlavorLimit(selectionItemObject, maxFlavors) ){
          return AT_FLAVOR_LIMIT_DIV;
        }
        const toLimitCount = this.getCountOfItemsToLimit()
        if ( toLimitCount >= maxItems && this.parentApp.help){
          return AT_ORDER_LIMIT_DIV;
        }
        return "";

      }
      this.pickNumberOfItemsMessage = function( maxItems , help ){
        if ( help ){
          const numberOfItemsToPick = maxItems - this.getCountOfItemsToLimit();
          return PICK_NUMBER_MORE_ITEMS.replace("numberPlaceholder", numberOfItemsToPick.toString() );
        }else{
          return "";
        }
      }

      this.getCountOfItemsToLimit = function(){
        let count = 0;
        for ( const itemInCart of this.cart ){
          if ( this.toLimit.has(itemInCart.type) ){
            count += itemInCart.count;
          }
        }
        return count;
      }

      this.alreadyAtMaxFlavorLimit = function(itemObj, appMaxFlavors){
        const countedFlavors = new Set([itemObj.flavor]);
        let flavorCount = 1
        for ( const itemInCart of this.cart ){
          if ( !itemInCart.hasOwnProperty("flavor") || countedFlavors.has(itemInCart.flavor)){
            continue;
          }
          if ( itemInCart.name === itemObj.name ){
            if ( flavorCount == appMaxFlavors ){
              return true;
            }
            countedFlavors.add(itemInCart.flavor);
            flavorCount = flavorCount + 1;
          }
        }
        return false;
      }
      this.countItems = function(){
        console.log('herre');
        var total = 0;
        for ( var i = 0 ; i < this.cart.length; i++ ){
          total += this.cart[i].count;
        }
        return total;
      }

    }

    function App(cart, menu){
      this.menu = {}
      for ( const menuItem of menu ){
        this.menu[menuItem.name] = new MenuItem(menuItem);
      }
      this.toLimit = new Set(["Entree", "entree"]);
      this.foodCounter = new FoodCounter(cart, this);
      this.maxItems = 20;
      this.maxFlavors = 4;
      this.currentItem = ''
      this.help = false;
      this.validGuests = false;
      this.environ = {}

      this.run = function(){
        this.showSelectedFood('#my-cart');
      
        for ( const menuItem in this.menu ){
          const menuClass = this.menu[menuItem]
          $(menuClass.target()).append(menuClass.button());

          const MyApp = this;

          $("#" + menuClass.getId() ).on('click', function(){

            const itemName = menuClass.environ.name;
            MyApp.currentItem = itemName;
            const type = MyApp.menu[itemName].environ.type;
            // create modal
            createModal('#modalHolder', menuClass.getModalContent(MyApp.help) );
            // show current items of this in cart to modal
            MyApp.showSelectedFood('#modal-cart', itemName);

            MyApp.attachAddToCartControlls(itemName, type);

            const close = document.getElementsByClassName('close')[0];

            close.addEventListener('click', function(){
              MyApp.currentItem = '';
              MyApp.showSelectedFood('#my-cart')
            });
          });
        }
      }

      this.showSelectedFood = function(idOfTarget, itemName = undefined, errorMessage = ""){
        const MyApp = this;
        // draw the selection to the cart
        let showSelectedFood = errorMessage + this.foodCounter.pickNumberOfItemsMessage(this.maxItems, this.help);
        if ( this.currentItem != '' && !this.toLimit.has(this.menu[this.currentItem].environ.type ) ){
          showSelectedFood = '';
        }
        showSelectedFood += this.foodCounter.toString(itemName);
        $(idOfTarget).html(showSelectedFood);
        $("#cart-count").html(this.foodCounter.countItems());

        // add controllers for the increase count and decrease count
        const incButtons = document.getElementsByClassName("increase");
        for ( let x = 0; x < incButtons.length; x++ ){
          incButtons[x].addEventListener("click", function(){
            // MyApp.foodCounter.cart[this.id].count += 1;
            const selectionItemObject = deepCopy(MyApp.foodCounter.cart[this.id]);
            selectionItemObject.count = 1;
            let errorMessage = '';
            let targetId = '#my-cart';
            if ( MyApp.foodCounter.canAddItemToCart(selectionItemObject, MyApp.maxFlavors, MyApp.maxItems, selectionItemObject.type, MyApp.help) ){
            // add the item to the card and re draw selection.
              MyApp.foodCounter.addItemToCart(selectionItemObject);
            }
            // only show error if the item type is type to limit number.
            if( MyApp.toLimit.has( selectionItemObject.type ) ){
              errorMessage = MyApp.foodCounter.getAddToCartError(selectionItemObject, MyApp.maxFlavors, MyApp.maxItems);
            }
            if( $("#modal-cart").html() != undefined ){
              targetId = "#modal-cart"
            }
            MyApp.showSelectedFood(targetId, itemName, errorMessage);
            if ( errorMessage.includes("cart limit") ){
              attachAddMore();
            }
          })
        }

        const decButtons = document.getElementsByClassName("decrease");
        for ( let x = 0; x < decButtons.length; x++ ){
          decButtons[x].addEventListener("click", function(){
            MyApp.foodCounter.cart[this.id].count -= 1;
            // if the count for this item goes to 0, remove it from the cart.
            if ( MyApp.foodCounter.cart[this.id].count == 0 ){
              MyApp.foodCounter.cart.splice(this.id, 1);
            }
            MyApp.showSelectedFood(idOfTarget, itemName);
          })
        }
      }

      this.attachAddToCartControlls = function(itemName, type){
        const MyApp = this;
        $("#addToCart").on('click', function(){
          // create item object.
          const selectionItemObject = getSelectedOptions(itemName, type)
          // if can add it to cart
          if ( MyApp.foodCounter.canAddItemToCart(selectionItemObject, MyApp.maxFlavors, MyApp.maxItems, type, MyApp.help) ){
            // add the item to the card and re draw selection.
            MyApp.foodCounter.addItemToCart(selectionItemObject);
            MyApp.showSelectedFood('#modal-cart', itemName)
          }else{
            const errorMessage = MyApp.foodCounter.getAddToCartError(selectionItemObject, MyApp.maxFlavors, MyApp.maxItems);
            MyApp.showSelectedFood('#modal-cart', itemName, errorMessage);
              if ( errorMessage.includes("cart limit") ){
                attachAddMore();
              }
          }
        });
      }

    }

    const getSelectedOptions = function(nameOfItem, itemType){
      const $selected = $(".select-setting");
      const thisItem = { count: 1, name: nameOfItem, type: itemType };
      $.each($selected, function(index, value) {
        thisItem[
          $(value)
            .find("option:selected")
            .val()
            .trim()
        ] = $(value)
          .find("option:selected")
          .text()
          .trim();
      });
      return thisItem;
    }
    let cart = []
    const urlParams = urlDecode();
    if( urlParams.hasOwnProperty("cart") ){
      cart = urlParams["cart"];
    }
    if ( urlParams.hasOwnProperty("adults") ){
      $("#numAdults").val( urlParams['adults'] );
    }
    if ( urlParams.hasOwnProperty("kids") ){
      $("#numKids").val( urlParams["kids"] );
    }
    const app = new App(cart, {{ menu | tojson }});
    app.run();

    const attachAddMore = function(){
      $("#add-more").on('click', function(){
        app.maxItems += 1;
        if ( $("#modal-cart").html() == undefined ){
          app.showSelectedFood('#my-cart');
        }else{
          app.showSelectedFood('#modal-cart', app.currentItem);
        }
      });
    }


    $('#checkoutButton').on('click', function(){
      const date = $('#datepicker').val();
      if ( date == "" || date == "None"){
        alert("Please select a date before continuing to check out.");
      }else if ( app.foodCounter.cart.length === 0){
        alert("There doesn't seem to be anything in your cart.")
      }else {
        sessionStorage.setItem("date", date);
        sessionStorage.setItem("cart", JSON.stringify(app.foodCounter.cart) );
        location.href = "/confirmCart#order-summary";
      }
    });

    $('#numAdults').on('input', function(){
      const paramsDictionary = {"cart" : app.foodCounter.cart, "adults" : $('#numAdults').val(), "kids": $('#numKids').val(), "date" : $('#datepicker').val()}
      urlEncodeParams(paramsDictionary);
      setAppMaxItems(app);
    });

    $('#numKids').on('input', function(){
      const paramsDictionary = {"cart" : app.foodCounter.cart, "adults" : $('#numAdults').val(), "kids": $('#numKids').val(), "date" : $('#datepicker').val()}
      urlEncodeParams(paramsDictionary);
      setAppMaxItems(app);
    })

    setAppMaxItems(app);
    $('#amount-help').on('click', function(){
      if ( app.help == false && app.validGuests == false){
        alert('Please enter a valid number of guests.');
      }else {
        const numberRec = $("#number-rec");
        if ( numberRec.html() === '' ){
          numberRec.html(`For ${app.environ.Adults} adults${ (app.environ.Kids != 0) ? ` and ${app.environ.Kids} kids` : ''}, we recommoned ${app.maxItems} entrees of the smallest size.`) ;
        }else {
          numberRec.empty()
        }
        app.help = !app.help;
        // set the url encoding search string //
        const paramsDictionary = {"help": app.help , "cart" : app.foodCounter.cart, "adults" : $('#numAdults').val(), "kids": $('#numKids').val(), "date" : $('#datepicker').val()}
        urlEncodeParams(paramsDictionary);
        /////////////////////////////////////////////
        app.foodCounter.cart = reverseResolutionOfItems(app.foodCounter.cart, app.help);
        app.showSelectedFood('#my-cart');
        $('#amount-help').toggleClass(function(){
          return 'focused-button';
        });
      }
    })

    const reverseResolutionOfItems = function(orginalCart, help){
      const newCart = []
      orginalCart.forEach( function(element){
        if ( hasCountProperty(element) ){
          const arrayOfResolution = ( help ) ? convertToSmallerSizes(element) :  convertToLargerSizes( element );
          arrayOfResolution.forEach(function(newResItem){
              newCart.push(newResItem);
          });
        }else{
          newCart.push(element);
        }
      });
      return reconcileCart(newCart);
    }
    const reconcileCart = function(oldCart){
      for ( let curIndex = 0; curIndex < oldCart.length ; curIndex++ ){
        for ( let checkIndex = curIndex + 1; checkIndex < oldCart.length; checkIndex++ ){
          if ( objectsAreEqual( oldCart[curIndex], oldCart[checkIndex], ['count']) ){
            oldCart[curIndex].count += oldCart[checkIndex].count;
            oldCart.splice(checkIndex, 1);
            checkIndex -= 1;
          }
        }
      }
      return oldCart;
    }
    const hasCountProperty = function(name){
      for ( const sizeKey of app.foodCounter.possibleSizeKeys ) {
        if ( app.menu[name.name].environ.hasOwnProperty(sizeKey) ){
          // console.log( this.parentApp.menu[name.name][sizeKey][0]);
          if ( app.menu[name.name].environ[sizeKey][0].hasOwnProperty("Count") || app.menu[name.name].environ[sizeKey][0].hasOwnProperty("count") ){
            return true;
          }
        }
      }
      return false;
    }
  const convertToSmallerSizes = function(itemObject){
    const newResArray = []
    const sizeKey = itemObject.hasOwnProperty("size") ? "size" : "portion";
    const itemSize = itemObject[sizeKey];
    const arrayOfItemSizes = app.menu[itemObject.name].environ.sizes;
    let minSize = {'Count' : 100 }
    arrayOfItemSizes.forEach( function(object){
      if ( parseInt(object.Count) < minSize.Count ){
        minSize = object
      }
    });
    const thisItemCount = arrayOfItemSizes.find( function(element){
      return element.name == itemSize;
    });
    const copyOfItem = deepCopy(itemObject);
    copyOfItem[sizeKey] = minSize.name;
    copyOfItem['count'] = ( parseInt(thisItemCount.Count) / parseInt(minSize.Count) ) * itemObject.count;
    newResArray.push(copyOfItem);
    return newResArray;
  }
  const convertToLargerSizes = function(itemObject){
    const newResArray = []
    const sizeKey = itemObject.hasOwnProperty("size") ? "size" : "portion";
    const itemSize = itemObject[sizeKey];
    let copyOfSizes = deepCopy(app.menu[itemObject.name].environ.sizes);
    const thisItemCount = copyOfSizes.find( function(element){
      return element.name == itemSize;
    })
    let totalPieces = parseInt(thisItemCount.Count) * itemObject.count;
    while ( copyOfSizes.length > 0 ){
      const currentLargestSize = Math.max.apply(Math, copyOfSizes.map(function(object) { return object.Count; }))
      const sizeObjectWithCurrentLargestSize = copyOfSizes.find( function(object){
        return object.Count == currentLargestSize;
      })
      if ( totalPieces >= sizeObjectWithCurrentLargestSize.Count ){
        const newItem = deepCopy(itemObject);
        newItem.count = 0;
        newItem.size = sizeObjectWithCurrentLargestSize.name;
        while ( totalPieces >= parseInt(sizeObjectWithCurrentLargestSize.Count) ){
          newItem.count += 1;
          totalPieces -= parseInt(sizeObjectWithCurrentLargestSize.Count);
        }
        newResArray.push(newItem);
      }
      copyOfSizes = copyOfSizes.filter( function(object){ return object.Count != currentLargestSize });
    }
    return newResArray;
  }

  window.addEventListener('click', function(){
    const paramsDictionary = {"cart" : app.foodCounter.cart, "adults" : $('#numAdults').val(), "kids": $('#numKids').val(), "date" : $('#datepicker').val()}
    urlEncodeParams(paramsDictionary);
  })
  
  $('#cart-click').on('click', function(){
    const cart = $("#my-cart");
    if ( cart.hasClass("hidden") ){
      cart.removeClass("hidden");
    }else{
      cart.addClass("hidden");
    }
  })