USE renjana_snacks;
INSERT INTO products (sku,name,variant,category,unit,size_label,description,price,stock,image_filename,active,sort_order) VALUES
('BAS-150-ORI','Basreng','Ori','Basreng','PCS','150 gr','Gurih dan renyah, cocok buat segala suasana.',16000,100,'basreng-ori-v18.jpg',1,1),
('BAS-150-PED','Basreng','Pedas','Basreng','PCS','150 gr','Sensasi pedas yang bikin nagih.',17000,100,'basreng-pedas-v18.jpg',1,2),
('BAS-150-EXT','Basreng','Extra Pedas','Basreng','PCS','150 gr','Pedasnya lebih nampol buat yang suka sensasi ekstra.',17000,100,'basreng-pedas-v18.jpg',1,3),
('MAK-150-ORI','Makaroni','Ori','Makaroni','PCS','150 gr','Makaroni kriuk dengan bumbu gurih.',16000,100,'makaroni-v18.jpg',1,4),
('MAK-150-PED','Makaroni','Pedas','Makaroni','PCS','150 gr','Cemilan ringan dengan tendangan cabai.',17000,100,'makaroni-v18.jpg',1,5),
('MAK-150-EXT','Makaroni','Extra Pedas','Makaroni','PCS','150 gr','Kriuk super pedas yang menantang.',17000,100,'makaroni-v18.jpg',1,6),
('USU-200-ORI','Usus Crispy','Ori','Usus','PCS','200 gr','Usus kriuk gurih yang cocok buat pecinta jeroan.',22000,100,'usus-ori-v18.jpg',1,7),
('USU-200-PED','Usus Crispy','Pedas','Usus','PCS','200 gr','Usus kriuk berbumbu pedas.',23000,100,'usus-pedas-v18.jpg',1,8),
('KRI-150-ORI','Kripca','Pedas','Kripca','PCS','150 gr','Keripik kaca pedas siap nemenin aktivitasmu.',12000,100,'kripca-v18.jpg',1,9),
('BAS-KG-ORI','Basreng Kiloan','Ori','Basreng','KG','1 kg','Lebih hemat untuk stok camilan.',65000,30,'basreng-ori-v18.jpg',0,10),
('BAS-KG-PED','Basreng Kiloan','Pedas','Basreng','KG','1 kg','Rasa pedas dalam ukuran kiloan.',67000,30,'basreng-pedas-v18.jpg',0,11),
('BAS-KG-EXT','Basreng Kiloan','Extra Pedas','Basreng','KG','1 kg','Ukuran kiloan untuk para pencinta pedas.',67000,30,'basreng-pedas-v18.jpg',0,12),
('MAK-KG-ORI','Makaroni Kiloan','Ori','Makaroni','KG','1 kg','Makaroni gurih ekonomis.',65000,30,'makaroni-v18.jpg',0,13),
('MAK-KG-PED','Makaroni Kiloan','Pedas','Makaroni','KG','1 kg','Makaroni pedas untuk rame-rame.',67000,30,'makaroni-v18.jpg',0,14),
('MAK-KG-EXT','Makaroni Kiloan','Extra Pedas','Makaroni','KG','1 kg','Makaroni extra pedas kiloan.',67000,30,'makaroni-v18.jpg',0,15),
('USU-KG-PED','Usus Crispy Kiloan','Pedas','Usus','KG','1 kg','Usus crispy pedas untuk stok banyak.',125000,30,'usus-pedas-v18.jpg',0,16),
('KRI-KG-ORI','Kripca Kiloan','Ori','Kripca','KG','1 kg','Kripca gurih dalam ukuran kiloan.',79000,30,'kripca-v18.jpg',0,17)
ON DUPLICATE KEY UPDATE
 name=VALUES(name),variant=VALUES(variant),category=VALUES(category),unit=VALUES(unit),size_label=VALUES(size_label),description=VALUES(description),price=VALUES(price),stock=VALUES(stock),image_filename=VALUES(image_filename),active=VALUES(active),sort_order=VALUES(sort_order);
