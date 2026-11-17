insert into public.categories(name,name_sw,slug,sort_order) values
('Fashion','Mitindo','fashion',1),('Electronics','Elektroniki','electronics',2),('Beauty','Urembo','beauty',3),('Home','Nyumbani','home',4)
on conflict(slug) do nothing;
insert into public.products(category_id,name,slug,price,compare_at_price,stock_quantity,sku,short_description,description,featured,active)
select c.id,p.name,p.slug,p.price,p.old_price,p.stock,p.sku,p.short,p.description,p.featured,true from (values
('fashion','Everyday Canvas Tote','everyday-canvas-tote',28000::numeric,35000::numeric,24,'FAS-TOTE-01','Roomy carryall for daily essentials.','A durable canvas tote with comfortable handles for everyday errands.',true),
('electronics','Wireless Earbuds','wireless-earbuds',68000,82000,18,'ELE-AUD-01','Clear sound for your day.','Compact wireless earbuds with a charging case and a comfortable fit.',true),
('beauty','Daily Glow Set','daily-glow-set',42000,null,15,'BEA-GLOW-01','Simple care for a fresh glow.','A gentle daily care set made for a clean, refreshed feel.',true),
('home','Ceramic Pour-Over Set','ceramic-pour-over-set',55000,65000,9,'HOM-COF-01','A calm start to your morning.','A ceramic pour-over dripper and matching cup for coffee at home.',true),
('fashion','Classic Weekend Shirt','classic-weekend-shirt',46000,null,20,'FAS-SHIRT-01','An easy fit for every day.','A soft, breathable shirt with a timeless relaxed shape.',false),
('electronics','Portable Power Bank','portable-power-bank',79000,null,12,'ELE-PWR-01','Stay charged on the move.','A compact power bank for reliable charging while you travel.',false),
('beauty','Soft Touch Hand Cream','soft-touch-hand-cream',18000,null,32,'BEA-HAND-01','Everyday moisture, wherever you go.','A lightweight hand cream that leaves skin feeling soft.',false),
('home','Woven Storage Basket','woven-storage-basket',36000,null,14,'HOM-BASK-01','A tidy home, naturally.','A versatile woven basket for keeping everyday items organized.',false)
) as p(category,name,slug,price,old_price,stock,sku,short,description,featured) join public.categories c on c.slug=p.category
on conflict(slug) do nothing;
