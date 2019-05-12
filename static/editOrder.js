
  const size_rules = { "Half Pan" : 2, "Full Pan" : 4, '48 oz Container' : 1.5}
  const countConversions = { "Taco Tray": 24, "Burrito Tray": 8 };

  const convertPriced = function( listOfItemDicts ){
    const entreePrices = getVal(prices, "entrees");
    let total = 0;
    listOfItemDicts.forEach(function(value){
      // console.log(value)
      let itemName = getVal(value, 'name')
      if ( itemName == "Side Choices" ){
        itemName= getVal(value, 'side')
      }
      const itemFlavor = getVal(value, "flavor")
      const itemPortion = getVal(value, "portion", "size")
      // console.log(itemPortion)
      // console.log(itemPortion)

      let countNumberInTray = getVal(countConversions, itemName)
      countNumberInTray *= getVal(size_rules, itemPortion)

      const numberOfThisItemInCart = getVal(value, "count");
      countNumberInTray *= numberOfThisItemInCart;

      const rulesForItem = getVal(entreePrices, itemName)

      const pricePerItemName= getVal(rulesForItem, itemFlavor, "default");

      countNumberInTray *= pricePerItemName;

      const multiplierForPortionSize = getVal( size_rules, itemPortion)
      value.cost = "$" + countNumberInTray.toFixed(2);
      total += countNumberInTray;
    })
    // console.log(total)
    return total;
  }
  const setTotal = function(targetId, priceData = window.prices){
    let total = 0;

    const foodCounterKeys = Object.keys(foodCounter).filter(key => key !== 'total');

    for ( foodKey of foodCounterKeys){
      if ( foodCounter.hasOwnProperty(foodKey) ){
        const itemsOfKey = foodCounter[foodKey].items;
        total += convertPriced(itemsOfKey);
      }
    }
    $(targetId).html(" $" + total.toFixed(2))
  }

  const getPrices = function(allEntreeKeys, $id){
    const pricesString = sessionStorage.getItem('entree_prices');

    if( typeof(pricesString) != typeof('string')){

      $.get('/get_prices/', function( data ) {
        prices = data;
        setTotal('#cart-total', data)
        drawToSelection(allEntreeKeys, $id, "");
      });
    }else{

     prices = JSON.parse( pricesString )
     setTotal('#cart-total')
     drawToSelection(allEntreeKeys, $id, "");
    }
  }

  const getVal = function(object, key, fallback){
    if( object.hasOwnProperty(key) ){
      return object[key]
    }else if( object.hasOwnProperty(fallback)) {
      return object[fallback]
    }else {
      return 1
    }
  }
  window.editOrder = true;

  const setFoodCounter = function(listOfPreviousOrderItems){
    if ( !typeof(foodCounter) ){
      setTimeout(function(){
        setFoodCounter(listOfPreviousOrderItems)
      },100 );
    }else{
      listOfPreviousOrderItems = JSON.parse(listOfPreviousOrderItems);
      for ( const item of listOfPreviousOrderItems ){
        appendOrAddItem(item, item.count);
      }
      const allEntreeKeys = Object.keys(window.foodCounter);

      const $id = window.selectedFoodOptions.Id;
      getPrices( allEntreeKeys, $id);
    }
  }

  const parseFoodCounter = function(){
    const foodCounterCopy = JSON.parse(JSON.stringify(foodCounter))

    for (const key of Object.keys(foodCounterCopy)) {
      if (foodCounterCopy.hasOwnProperty(key)) {
        if( foodCounterCopy[key].hasOwnProperty('items') ){
          delete foodCounterCopy[key].flavors
          if( foodCounterCopy[key].items.length === 0 ){
            delete foodCounterCopy[key];
          }
        }
      }
    }
    return JSON.stringify(foodCounter);
  }
  const confirmChanges = function(){
    const order = parseFoodCounter();

    $.post('/commit_order_edit/', {order : order}).done(function( data ){
      if( data.error === 'failed'){
        alert('something went wrong')
      }else{
        location.href = '/user_orders';
      }
    })
  }
    window.onload = function() {
      const previousOrder = {{ order|tojson }};
      setTimeout(function(){
        setFoodounter(previousOrder);
      }, 100)
      // console.log(JSON.parse(previousOrder));
    }