-- ============================================================
-- Seed Alex's existing properties
--
-- HOW TO USE:
-- 1. Sign into the app with Google
-- 2. In Supabase Dashboard > SQL Editor, run:
--    SELECT id FROM auth.users WHERE email = 'alexcomery@gmail.com';
-- 3. Copy the UUID from the result
-- 4. Replace YOUR_USER_UUID_HERE below with that UUID
-- 5. Run this entire script
-- ============================================================

DO $$
DECLARE
  uid UUID := 'YOUR_USER_UUID_HERE';  -- << paste your UUID here
BEGIN

-- ── Hero / Only Tab ─────────────────────────────────────────

INSERT INTO properties (user_id,address,region,price,beds,baths,sqft,dom,annual_rev,piti,down_payment,tab_label,zillow_link) VALUES
(uid,'1335 Fortuna Ave, Landers, CA 92285','Landers',375000,2,1,952,110,4863,2337.42,112500,'general',NULL),
(uid,'56367 Scandia Ln, Yucca Valley, CA 92284','Yucca Valley',510000,1,2,994,763,0,3106.13,153000,'general',NULL),
(uid,'8500 S Samel Rd, Morongo Valley, CA 92256','Morongo Valley',440000,1,1,936,NULL,81500,2707.13,132000,'general',NULL),
(uid,'1224 Shangri La Rd, Joshua Tree, CA 92252','Joshua Tree',325000,1,1,1937,NULL,0,2052.56,97500,'general',NULL),
(uid,'4650 Sizer Canyon Rd, Johnson Valley, CA 92285','Johnson Valley',440000,2,1,947,254,36800,2707.13,132000,'general',NULL),
(uid,'7276 Encina Rd, Joshua Tree, CA 92252','Joshua Tree',374900,1,1,662,118,62600,2336.95,112470,'general','https://www.zillow.com/homedetails/7276-Encina-Rd-Joshua-Tree-CA-92252/337970717_zpid/'),
(uid,'877 E Phillips Rd, Landers, CA 92285','Landers',299000,1,1,690,465,26200,1903.48,89700,'general','https://www.zillow.com/homedetails/877-E-Phillips-Rd-Landers-CA-92285/17508176_zpid/'),
(uid,'63300 Tilford Way, Joshua Tree, CA 92252','Joshua Tree',399000,1,1,900,1,90789,2474.19,119700,'general','https://www.zillow.com/homedetails/63300-Tilford-Way-Joshua-Tree-CA-92252/17508509_zpid/'),
(uid,'2351 N Cambria Ave, Landers, CA 92285','Landers',499000,3,2,1467,6,94280,3043.90,149700,'general','https://www.zillow.com/homedetails/2351-N-Cambria-Ave-Landers-CA-92285/463469847_zpid/');

-- original_price updates for price-dropped properties
UPDATE properties SET original_price = 399000 WHERE user_id = uid AND address = '7276 Encina Rd, Joshua Tree, CA 92252';
UPDATE properties SET original_price = 369000 WHERE user_id = uid AND address = '877 E Phillips Rd, Landers, CA 92285';

-- ── La Quinta ───────────────────────────────────────────────

INSERT INTO properties (user_id,address,region,price,beds,baths,sqft,annual_rev,piti,down_payment,tab_label) VALUES
(uid,'50740 Santa Rosa Plz APT 2, La Quinta, CA 92253','La Quinta',315000,1,1,682,28400,1994.99,94500,'laquinta');

-- ── Duplex ──────────────────────────────────────────────────

INSERT INTO properties (user_id,address,region,price,beds,baths,sqft,annual_rev,piti,down_payment,tab_label,zillow_link) VALUES
(uid,'4537 Anita Ave, Yucca Valley, CA 92284','Morongo',620000,6,3,2965,53500,3733.41,186000,'duplex',NULL),
(uid,'56367 Scandia Ln, Yucca Valley, CA 92284','Morongo',510000,1,2,994,0,3106.13,153000,'duplex',NULL),
(uid,'69450 Amboy Rd, Twentynine Palms, CA 92277','29 Palms',599000,4,2,1303,103600,3613.61,179700,'duplex',NULL);

-- ── Big Bear ────────────────────────────────────────────────

INSERT INTO properties (user_id,address,region,price,beds,baths,sqft,annual_rev,piti,down_payment,tab_label,zillow_link) VALUES
(uid,'376 Riverside Ave, Sugarloaf, CA 92386','Big Bear',259900,1,1,504,19700,1681.38,77970,'bigbear',NULL),
(uid,'396 Kern Ave, Sugarloaf, CA 92386','Big Bear',299999,2,1,720,19000,1909.13,89999,'bigbear','https://www.zillow.com/homedetails/396-Riverside-Ave-Sugarloaf-CA-92386/17622076_zpid/'),
(uid,'697 Villa Grove Ave, Big Bear City, CA 92314','Big Bear',299900,2,1,750,44500,1908.67,89970,'bigbear','https://www.zillow.com/homedetails/697-Villa-Grove-Ave-Big-Bear-City-CA-92314/17621284_zpid/');

UPDATE properties SET dom = 53 WHERE user_id = uid AND address = '697 Villa Grove Ave, Big Bear City, CA 92314';

-- ── ADU ─────────────────────────────────────────────────────

INSERT INTO properties (user_id,address,region,price,beds,baths,sqft,annual_rev,piti,down_payment,tab_label) VALUES
(uid,'1388 Jemez Trl, Landers, CA 92285','Landers',499999,3,3,3120,0,3049.55,149999,'adu'),
(uid,'57920 Buena Vista Dr, Yucca Valley, CA 92284','Yucca Valley',475000,3,2,1600,35900,2907.13,142500,'adu');

UPDATE properties SET dom = 238 WHERE user_id = uid AND address = '1388 Jemez Trl, Landers, CA 92285';

-- ── Money Tab ───────────────────────────────────────────────

INSERT INTO properties (user_id,address,region,price,beds,baths,sqft,dom,annual_rev,piti,down_payment,tab_label,zillow_link) VALUES
(uid,'60654 Mitch Ln, Landers, CA 92285','Landers',365000,1,1,448,72,58741,2274.74,109500,'money','https://www.zillow.com/homedetails/60654-Mitch-Ln-Landers-CA-92285/299170864_zpid/'),
(uid,'69450 Amboy Rd, Twentynine Palms, CA 92277','29 Palms',599000,4,2,1303,NULL,80232,3613.61,179700,'money',NULL),
(uid,'7276 Encina Rd, Joshua Tree, CA 92252 (money)','Joshua Tree',374900,1,1,662,118,52364,2336.95,112470,'money','https://www.zillow.com/homedetails/7276-Encina-Rd-Joshua-Tree-CA-92252/337970717_zpid/'),
(uid,'8729 Rockhaven Rd, Joshua Tree, CA 92252','Joshua Tree',710000,1,1,968,NULL,107332,4246.55,213000,'money',NULL),
(uid,'72767 Mesquite Dunes Rd, Twentynine Palms, CA 92277','29 Palms',599000,2,1,1094,NULL,75000,3613.61,179700,'money',NULL),
(uid,'55921 Ornelas Ln, Landers, CA 92285','Landers',349000,2,2,976,126,42219,2189.33,104700,'money','https://www.zillow.com/homedetails/55921-Ornelas-Ln-Landers-CA-92285/17507410_zpid/'),
(uid,'290 Bluegrass Rd, Twentynine Palms, CA 92277','29 Palms',359000,3,1,1451,NULL,51387,2245.91,107700,'money',NULL),
(uid,'1564 Luna Mesa Rd, Yucca Valley, CA 92284','Yucca Valley',498000,2,2,792,47,77000,3038.24,149400,'money','https://www.zillow.com/homedetails/1564-Luna-Mesa-Rd-Yucca-Valley-CA-92284/17508241_zpid/'),
(uid,'2351 N Cambria Ave, Landers, CA 92285 (money)','Landers',499000,3,2,1467,6,109600,3043.90,149700,'money','https://www.zillow.com/homedetails/2351-N-Cambria-Ave-Landers-CA-92285/463469847_zpid/');

UPDATE properties SET original_price = 385000 WHERE user_id = uid AND address = '60654 Mitch Ln, Landers, CA 92285';

-- ── Sold ────────────────────────────────────────────────────

INSERT INTO properties (user_id,address,region,price,beds,baths,sqft,annual_rev,piti,down_payment,tab_label,sold) VALUES
(uid,'446 Riverside Ave, Sugarloaf, CA 92386','Big Bear',309000,1,1,573,19700,1961.05,92700,'sold',TRUE);

-- ── Comps ───────────────────────────────────────────────────

INSERT INTO comps (user_id,address,listing_name,annual_rev,adr,occupancy,rating,reviews,notes) VALUES
(uid,'3979 Dusty Mile Rd, Landers, CA 92285','Escape and Rejuvenate at K.B.''s Desert Cabin',20500,149,0.315,4.9,195,''),
(uid,'55125 Gleason Rd, Landers, CA 92285','Arcturus Landing - The brightest star in the desert',29700,152,0.474,5.0,491,''),
(uid,'GPS: 34.30113, -116.42657 (unlisted)','Watermelon Sugar, Joshua Tree - Top 5% - pool, spa',51300,289,0.43,5.0,290,'Pool, Spa'),
(uid,'2088 Acoma Trail, Landers, CA 92285','The Yucca Escape',57500,170,0.732,4.9,156,'Pool, Hot Tub, Record Player, Hammock, Fire Pit'),
(uid,'GPS: 34.30735, -116.44860 (unlisted)','Peaceful 2 Bedroom High Desert Getaway on 5 acres!',34200,216,0.356,5.0,127,''),
(uid,'3275 Dusty Mile Rd, Landers, CA 92285','Serene Retreat: Spa, Stars, Fire pit, Pet-friendly',39300,228,0.375,4.9,179,''),
(uid,'55150 Gleason Rd, Landers, CA 92285','Modern Desert Cabin-Hot Tub/Fire Pit/BBQ',37200,168,0.493,5.0,221,''),
(uid,'55960 Einstein Rd, Landers, CA 92285','Star Gazing | Outdoor Shower | Cowboy Pool | Spa',41000,208,0.441,5.0,167,'');

END $$;
