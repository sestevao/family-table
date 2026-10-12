// Aisles: v veg, m meat/fish, d dairy, b bakery, c cupboard, f frozen, o other, s staple
export const AISLES = {
  v: { name: "Fruit & veg", where: "Kingsland Market (St Mary's) or a local greengrocer for the best price; Aldi and Lidl are cheap too." },
  m: { name: "Meat & fish", where: "A local butcher, or Aldi, Lidl, Tesco or Sainsbury's." },
  d: { name: "Dairy & eggs", where: "Aldi or Lidl." },
  b: { name: "Bread & wraps", where: "Any supermarket or a local bakery." },
  c: { name: "Tins, pasta & jars", where: "Aldi or Lidl. Big bags of rice and spices are cheaper at the international grocers around St Mary's." },
  f: { name: "Frozen", where: "Aldi, Lidl or Iceland." },
  o: { name: "Other", where: "" },
  s: { name: "Cupboard staples", where: "Check the cupboard before you buy." },
};
export const AISLE_ORDER = ["v", "m", "d", "b", "c", "f", "o", "s"];

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const SPECIAL = {
  left: { name: "Leftovers", sub: "Use up what's in the fridge", pic: "🥡" },
  out: { name: "Eating out / takeaway", sub: "No cooking tonight", pic: "🍕" },
};

// Every recipe serves 4. ing: [qty, unit, name, aisle]
export const LIBRARY = [
  { id: "fajita", pic: "🌯", name: "Chicken fajita traybake", mins: 25, meal: ["dinner"], tags: ["kids"],
    ing: [[500, "g", "chicken breast", "m"], [3, "", "peppers", "v"], [1, "", "red onion", "v"], [1, "sachet", "fajita seasoning", "c"], [8, "", "tortilla wraps", "b"], [150, "ml", "soured cream", "d"], [100, "g", "cheddar", "d"], [0, "", "olive oil", "s"]],
    steps: ["Heat oven to 200°C (180°C fan).", "Slice the chicken, peppers and onion. Toss on a big tray with the seasoning and a splash of oil.", "Roast 20 minutes, stirring once.", "Warm the wraps and serve with soured cream and grated cheese."] },
  { id: "sausage", pic: "🌭", name: "Sausage & butter bean casserole", mins: 35, meal: ["dinner"], tags: ["kids"],
    ing: [[8, "", "pork sausages", "m"], [1, "", "onion", "v"], [2, "clove", "garlic", "v"], [1, "tin", "chopped tomatoes (400 g)", "c"], [1, "tin", "butter beans (400 g)", "c"], [1, "", "crusty loaf", "b"], [0, "", "smoked paprika", "s"], [0, "", "olive oil", "s"]],
    steps: ["Brown the sausages in a deep pan, 8 minutes. Remove.", "Soften the sliced onion and garlic 5 minutes, add 1 tsp paprika.", "Add tomatoes, drained beans and the sausages. Simmer 20 minutes.", "Serve with crusty bread."] },
  { id: "bolognese", pic: "🍝", name: "Quick spaghetti bolognese", mins: 30, meal: ["dinner"], tags: ["kids"],
    ing: [[500, "g", "beef mince", "m"], [1, "", "onion", "v"], [1, "", "carrot", "v"], [2, "clove", "garlic", "v"], [2, "tin", "chopped tomatoes (400 g)", "c"], [400, "g", "spaghetti", "c"], [40, "g", "parmesan", "d"], [0, "", "dried oregano", "s"]],
    steps: ["Fry the mince until browned. Add the finely chopped onion, grated carrot and garlic for 5 minutes.", "Add tomatoes and a pinch of oregano. Simmer 15 minutes.", "Cook the spaghetti meanwhile.", "Toss together and finish with parmesan."] },
  { id: "salmon", pic: "🐟", name: "Salmon, potato & broccoli traybake", mins: 30, meal: ["dinner"], tags: ["healthy"],
    ing: [[4, "", "salmon fillets", "m"], [750, "g", "new potatoes", "v"], [200, "g", "tenderstem broccoli", "v"], [1, "", "lemon", "v"], [1, "jar", "green pesto", "c"], [0, "", "olive oil", "s"]],
    steps: ["Heat oven to 200°C. Halve the potatoes, toss in oil and roast 15 minutes.", "Add the broccoli and salmon to the tray, top the salmon with a spoon of pesto.", "Roast 12–15 minutes more. Squeeze over lemon."] },
  { id: "chickpasta", pic: "🍄", name: "Creamy chicken & mushroom pasta", mins: 20, meal: ["dinner"], tags: ["kids"],
    ing: [[400, "g", "chicken breast", "m"], [250, "g", "mushrooms", "v"], [2, "clove", "garlic", "v"], [400, "g", "penne", "c"], [200, "g", "light cream cheese", "d"], [100, "g", "baby spinach", "v"], [0, "", "olive oil", "s"]],
    steps: ["Cook the penne. Save a mug of the pasta water.", "Fry the diced chicken 6 minutes, add sliced mushrooms and garlic for 4 minutes.", "Stir in the cream cheese, spinach and a splash of pasta water.", "Toss with the pasta."] },
  { id: "curry", pic: "🍛", name: "Chickpea & spinach curry", mins: 25, meal: ["dinner"], tags: ["veggie", "healthy"],
    ing: [[1, "", "onion", "v"], [2, "clove", "garlic", "v"], [1, "jar", "tikka curry paste", "c"], [2, "tin", "chickpeas (400 g)", "c"], [1, "tin", "coconut milk (400 ml)", "c"], [200, "g", "baby spinach", "v"], [300, "g", "basmati rice", "c"], [4, "", "naan breads", "b"]],
    steps: ["Soften the onion and garlic 5 minutes. Add 3 tbsp curry paste for 1 minute.", "Add drained chickpeas and coconut milk. Simmer 12 minutes. Cook the rice meanwhile.", "Stir in the spinach until wilted. Serve with rice and warm naan."] },
  { id: "burgers", pic: "🍔", name: "Homemade burgers & wedges", mins: 35, meal: ["dinner"], tags: ["kids"],
    ing: [[500, "g", "beef mince", "m"], [4, "", "burger buns", "b"], [1, "kg", "potatoes", "v"], [1, "", "little gem lettuce", "v"], [2, "", "tomatoes", "v"], [4, "slice", "cheese slices", "d"], [0, "", "olive oil", "s"]],
    steps: ["Heat oven to 220°C. Cut potatoes into wedges, toss in oil and salt, roast 30 minutes.", "Season the mince and shape 4 patties.", "Fry or grill the burgers 4–5 minutes each side, cheese on for the last minute.", "Build in buns with lettuce and tomato."] },
  { id: "friedrice", pic: "🍤", name: "Prawn egg fried rice", mins: 15, meal: ["dinner", "lunch"], tags: ["quick"],
    ing: [[2, "pouch", "microwave rice (250 g)", "c"], [300, "g", "frozen king prawns", "f"], [200, "g", "frozen peas", "f"], [4, "", "eggs", "d"], [1, "bunch", "spring onions", "v"], [0, "", "soy sauce", "s"], [0, "", "vegetable oil", "s"]],
    steps: ["Stir-fry the prawns and peas in a hot wok 3 minutes.", "Push aside, scramble the eggs in the gap.", "Add the rice, break it up and fry 3 minutes.", "Season with soy sauce and scatter over sliced spring onions."] },
  { id: "gnocchi", pic: "🧀", name: "Pesto gnocchi traybake", mins: 25, meal: ["dinner"], tags: ["veggie", "quick"],
    ing: [[1, "kg", "gnocchi", "c"], [300, "g", "cherry tomatoes", "v"], [1, "", "courgette", "v"], [1, "", "mozzarella ball", "d"], [1, "jar", "green pesto", "c"], [0, "", "olive oil", "s"]],
    steps: ["Heat oven to 200°C. Toss gnocchi, tomatoes and chopped courgette with oil on a tray.", "Roast 20 minutes until golden.", "Stir through pesto, tear over the mozzarella and return 3 minutes."] },
  { id: "fishwraps", pic: "🌮", name: "Fish finger wraps", mins: 15, meal: ["dinner", "lunch"], tags: ["kids", "quick"],
    ing: [[12, "", "fish fingers", "f"], [8, "", "tortilla wraps", "b"], [1, "", "little gem lettuce", "v"], [300, "g", "coleslaw", "d"], [1, "", "lemon", "v"]],
    steps: ["Cook the fish fingers as the pack says (oven or air fryer).", "Warm the wraps.", "Fill with lettuce, coleslaw and fish fingers, squeeze over lemon."] },
  { id: "stirfry", pic: "🍜", name: "Chicken noodle stir-fry", mins: 15, meal: ["dinner"], tags: ["quick", "healthy"],
    ing: [[400, "g", "chicken breast", "m"], [2, "pack", "stir-fry vegetables (300 g)", "v"], [300, "g", "egg noodles", "c"], [1, "sachet", "stir-fry sauce", "c"], [0, "", "vegetable oil", "s"]],
    steps: ["Cook the noodles. Drain.", "Stir-fry the sliced chicken in a hot wok 5 minutes.", "Add the veg for 3 minutes, then the noodles and sauce. Toss 1 minute."] },
  { id: "roast", pic: "🍗", name: "Sunday roast chicken traybake", mins: 75, meal: ["dinner"], tags: ["weekend"],
    ing: [[1, "", "whole chicken (1.5 kg)", "m"], [1, "kg", "potatoes", "v"], [4, "", "carrots", "v"], [1, "", "red onion", "v"], [1, "", "lemon", "v"], [1, "pack", "gravy granules", "c"], [0, "", "olive oil", "s"]],
    steps: ["Heat oven to 200°C. Put the chicken in a big tray with the lemon inside.", "Surround with chunks of potato, carrot and onion, toss in oil and salt.", "Roast 1 hour 15 minutes until the juices run clear.", "Rest 10 minutes and make gravy."] },
  { id: "chilli", pic: "🌶️", name: "Chilli jacket potatoes", mins: 30, meal: ["dinner", "lunch"], tags: ["kids"],
    ing: [[4, "", "baking potatoes", "v"], [500, "g", "beef mince", "m"], [1, "", "onion", "v"], [1, "tin", "kidney beans (400 g)", "c"], [1, "tin", "chopped tomatoes (400 g)", "c"], [100, "g", "cheddar", "d"], [0, "", "chilli powder", "s"]],
    steps: ["Prick the potatoes, microwave 10–12 minutes, then crisp in a hot oven 10 minutes.", "Brown the mince and onion. Add 1 tsp chilli powder, beans and tomatoes. Simmer 15 minutes.", "Split the potatoes, spoon over chilli and top with cheese."] },
  { id: "toasties", pic: "🥪", name: "Tomato soup & cheese toasties", mins: 15, meal: ["lunch"], tags: ["kids", "veggie", "quick"],
    ing: [[2, "tin", "tomato soup (400 g)", "c"], [1, "", "sliced bread loaf", "b"], [150, "g", "cheddar", "d"], [0, "", "butter", "s"]],
    steps: ["Heat the soup.", "Butter the bread, fill with grated cheese and fry or grill until golden on both sides.", "Cut into soldiers for dunking."] },
  { id: "tunajacket", pic: "🥔", name: "Tuna & sweetcorn jackets", mins: 15, meal: ["lunch"], tags: ["quick"],
    ing: [[4, "", "baking potatoes", "v"], [2, "tin", "tuna (145 g)", "c"], [1, "tin", "sweetcorn (198 g)", "c"], [0, "", "mayonnaise", "s"]],
    steps: ["Prick the potatoes and microwave 10–12 minutes until soft.", "Mix the drained tuna and sweetcorn with mayo.", "Split and fill the potatoes."] },
  { id: "caesar", pic: "🥬", name: "Chicken Caesar wraps", mins: 10, meal: ["lunch"], tags: ["quick"],
    ing: [[300, "g", "cooked chicken pieces", "m"], [4, "", "tortilla wraps", "b"], [2, "", "little gem lettuce", "v"], [1, "bottle", "Caesar dressing", "c"], [30, "g", "parmesan", "d"]],
    steps: ["Shred the lettuce and mix with the chicken and 3 tbsp dressing.", "Pile into wraps, grate over parmesan and roll up."] },
  { id: "falafel", pic: "🧆", name: "Falafel & hummus pittas", mins: 15, meal: ["lunch"], tags: ["veggie", "quick"],
    ing: [[1, "pack", "falafel (12)", "d"], [6, "", "pitta breads", "b"], [200, "g", "hummus", "d"], [0.5, "", "cucumber", "v"], [200, "g", "cherry tomatoes", "v"]],
    steps: ["Warm the falafel and pittas as the packs say.", "Spread hummus inside the pittas.", "Fill with falafel, sliced cucumber and tomatoes."] },
  { id: "omelette", pic: "🍳", name: "Ham & cheese omelette", mins: 10, meal: ["lunch"], tags: ["quick", "kids"],
    ing: [[8, "", "eggs", "d"], [120, "g", "sliced ham", "m"], [80, "g", "cheddar", "d"], [200, "g", "cherry tomatoes", "v"], [0, "", "butter", "s"]],
    steps: ["Beat 2 eggs per person with a pinch of salt.", "Melt a little butter in a frying pan, add the eggs and swirl.", "Scatter over ham and cheese, fold when nearly set. Serve with tomatoes."] },
  { id: "pastasalad", pic: "🥗", name: "Pesto pasta salad", mins: 15, meal: ["lunch"], tags: ["veggie", "kids"],
    ing: [[300, "g", "fusilli", "c"], [1, "tin", "sweetcorn (198 g)", "c"], [200, "g", "cherry tomatoes", "v"], [0.5, "", "cucumber", "v"], [100, "g", "cheddar", "d"], [1, "jar", "green pesto", "c"]],
    steps: ["Cook the pasta, rinse under cold water and drain.", "Stir in 3 tbsp pesto, the sweetcorn, halved tomatoes, diced cucumber and cubed cheese.", "Keeps in the fridge for lunchboxes for 2 days."] },
];

// The week you had planned in the first version of the app
export const STARTER_WEEK = [
  ["toasties", "chickpasta"], ["caesar", "fajita"], ["tunajacket", "curry"], ["omelette", "stirfry"],
  ["falafel", "fishwraps"], ["pastasalad", "burgers"], ["toasties", "roast"],
].map(([lunch, dinner]) => ({ lunch: { r: lunch }, dinner: { r: dinner } }));
