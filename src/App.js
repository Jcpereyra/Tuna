import React, { useState, useEffect } from 'react';
import './App.css';
import { db, storage } from './FirebaseConfig';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { ref, getDownloadURL, listAll } from 'firebase/storage';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './basket.png';

// Fixing the default icon issue with Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

function App() {
  const [storeInfo, setStoreInfo] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [menu, setMenu] = useState({});
  const [cart, setCart] = useState({});
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [status, setStatus] = useState('');
  const [service, setService] = useState({});
  const [location, setLocation] = useState([52.40375, 9.66171]); // Default location
  const [pickupDetails, setPickupDetails] = useState({ name: '', phone: '' });
  const [deliveryDetails, setDeliveryDetails] = useState({ name: '', email: '', address: '', phone: '', payment: 'Paypal' });
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [news,setNews]=useState([]);

  useEffect(() => {
    const fetchStoreInfo = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'StoreInformations'));
        if (!querySnapshot.empty) {
          querySnapshot.forEach(doc => {
            setStoreInfo(doc.data());
            console.log('store Infos:',doc.data());
          });
          console.log('Store information fetched:', querySnapshot);
        } else {
          console.log('No documents found!');
        }
      } catch (error) {
        console.error('Error getting documents:', error);
      }
    };

    const fetchStatus = async () => {
      try {
        const statusSnapshot = await getDocs(collection(db, 'Status'));
        if (!statusSnapshot.empty) {
          statusSnapshot.forEach(sta => {
            setStatus(sta.data().Avaible);
          });
        } else {
          setStatus('Store Status is Currently disabled');
        }
      } catch (err) {
        console.error("Status Error", err);
      }
    };

    const fetchService = async () => {
      try {
        const serviceSnapshot = await getDocs(collection(db, 'service'));
        if (!serviceSnapshot.empty) {
          const serviceData = {};
          serviceSnapshot.forEach(doc => {
            const data = doc.data();
            Object.keys(data).forEach(day => {
              serviceData[day] = data[day];
            });
          });
          setService(serviceData);
          console.log('Service data fetched:', serviceData);
        } else {
          alert('Our Service is Currently disabled, try to reach us with a call');
        }
      } catch (err) {
        console.error("Service Error", err);
        alert('Error fetching service data');
      }
    };

    const fetchLogoUrl = async () => {
      try {
        const logoRef = ref(storage, 'Logos/store.jpg'); // Adjust the path as needed
        const url = await getDownloadURL(logoRef);
        setLogoUrl(url);
        console.log('Logo URL fetched:', url);
      } catch (error) {
        console.error('Error fetching logo URL:', error);
      }
    };

    const fetchMenuFileNames = async () => {
      try {
        const menuRef = ref(storage, 'Menu/'); // Reference to the Menu folder
        const menuList = await listAll(menuRef); // Use listAll to get a list of items in the folder

        // Store the names of the JSON files
        const fileNames = menuList.items.map(itemRef => itemRef.name);
        console.log("Menu file names:", fileNames);
        return fileNames;
      } catch (error) {
        console.error('Error fetching menu file names:', error);
        throw error;
      }
    };

    const fetchMenuFileContent = async (fileName) => {
      try {
        const fileRef = ref(storage, `Menu/${fileName}`); // Reference to the JSON file
        const url = await getDownloadURL(fileRef); // Get the download URL for the JSON file
        const response = await fetch(url); // Fetch the JSON file
        const data = await response.json(); // Parse the JSON data
        console.log("JSON file content for", fileName, ":", data); // Log the JSON file content
        return { category: fileName.split('.')[0], items: data }; // Return category and items
      } catch (error) {
        console.error(`Error fetching content of ${fileName}:`, error);
        throw error;
      }
    };

    const fetchMenu = async () => {
      try {
        // Step 1: Fetch file names
        const fileNames = await fetchMenuFileNames();

        // Step 2: Fetch each file's content using the names
        const fetchPromises = fileNames.map(fileName => fetchMenuFileContent(fileName));
        const menuDataArray = await Promise.all(fetchPromises);

        // Fetch images for each item
        for (const { category, items } of menuDataArray) {
          for (const item of items) {
            item.imageUrl = await fetchImage(category, item.id);
          }
        }

        // Transform the array into an object for easier access
        const menuData = menuDataArray.reduce((acc, { category, items }) => {
          acc[category] = items;
          return acc;
        }, {});

        setMenu(menuData);
        setLoadingMenu(false);
        console.log('Menu fetched:', menuData);
      } catch (error) {
        console.error('Error fetching menu:', error);
      }
    };

    const fetchImage = async (category, itemId) => {
      const imageFormats = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
      for (const format of imageFormats) {
        try {
          const imageRef = ref(storage, `Media/${category}/${itemId}${format}`);
          const url = await getDownloadURL(imageRef);
          console.log(`Image URL fetched for ${itemId}:`, url);
          return url;
        } catch (error) {
          console.warn(`Error fetching image ${itemId}${format}:`, error);
        }
      }
      return '';
    };

    const fetchLocation = async () => {
      try {
        const locationSnapshot = await getDocs(collection(db, 'StoreLocation'));
        if (!locationSnapshot.empty) {
          locationSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.latitude && data.longitude) {
              setLocation([data.latitude, data.longitude]);
            }
          });
        } else {
          console.log('No location documents found!');
        }
      } catch (error) {
        console.error('Error getting location documents:', error);
      }
    };
    const fetchNews = async () => {
      try {
        const newsReference = ref(storage, 'News/news.json'); // Reference to the JSON file
        const imagesReference = ref(storage, 'News/newsImages'); // Reference to the images folder
    
        // Get the download URL for the JSON file
        const newsJsonUrl = await getDownloadURL(newsReference);
    
        // Fetch the JSON file
        const response = await fetch(newsJsonUrl);
        const newsData = await response.json();
    
        // Ensure newsData is an array
        const newsArray = Array.isArray(newsData) ? newsData : [newsData];
    
        // List all items (images) in the images folder
        const imagesList = await listAll(imagesReference);
    
        // Create a map of image names (excluding extensions) to their download URLs
        const imageMap = {};
        for (const itemRef of imagesList.items) {
          const imageNameWithExt = itemRef.name;
          const imageUrl = await getDownloadURL(itemRef);
          imageMap[imageNameWithExt] = imageUrl;
        }
    
        // Update the JSON data with the correct image paths
        const updatedNewsData = newsArray.map(item => {
          const imageName = `${item.title.replace(/\s+/g, '')}.png`; // Create image name based on title
          if (imageMap[imageName]) {
            item.imageUrl = imageMap[imageName];
          }
          return item;
        });
    
        setNews(updatedNewsData);
        console.log('news', updatedNewsData);
      } catch (error) {
        console.error('Error fetching news data:', error);
        throw error;
      }
    };

    fetchStoreInfo();
    fetchLogoUrl();
    fetchMenu();
    fetchStatus();
    fetchService();
    fetchLocation();
    fetchNews();
  }, []);

  const addToCart = (item) => {
    setCart((prevCart) => {
      const newCart = { ...prevCart };
      if (newCart[item.name]) {
        newCart[item.name] = { ...item, quantity: newCart[item.name].quantity + 1 };
      } else {
        newCart[item.name] = { ...item, quantity: 1 };
      }
      return newCart;
    });
  };
  
  const removeFromCart = (itemName) => {
    setCart((prevCart) => {
      const newCart = { ...prevCart };
      if (newCart[itemName]) {
        if (newCart[itemName].quantity > 1) {
          newCart[itemName] = { ...newCart[itemName], quantity: newCart[itemName].quantity - 1 };
        } else {
          delete newCart[itemName];
        }
      }
      return newCart;
    });
  };

  const getTotalPrice = () => {
    return Object.values(cart).reduce((total, item) => total + item.quantity * parseFloat(item.price.replace('€', '').replace(',', '.')), 0).toFixed(2);
  };

  const handlePickup = async () => {
    if (pickupDetails.name && pickupDetails.phone) {
      try {
        await addDoc(collection(db, 'Abholungen'), {
          ...pickupDetails,
          cartItems: cart,
          totalPrice: getTotalPrice(),
        });
        setShowPickupModal(false);
        setCart({});
        alert('Pickup order placed successfully!');
      } catch (error) {
        console.error('Error placing pickup order:', error);
        alert('Error placing pickup order. Please try again.');
      }
    } else {
      alert('Please fill in all required fields.');
    }
  };
  const handleDelivery = async () => {
    const { name, email, address, phone, payment, paypalEmail, cardNumber, expirationDate, cvv } = deliveryDetails;
  
    if (name && email && address && phone && payment) {
      // Check for required fields based on payment method
      const isPaypal = payment === 'Paypal' && paypalEmail;
      const isCard = payment === 'Card' && cardNumber && expirationDate && cvv;
      const isCash = payment === 'Cash';
      
      if (isPaypal || isCard || isCash) {
        try {
          let paymentData = {
            paymentMethod: payment,
          };
  
          if (isPaypal) {
            paymentData.paypalEmail = paypalEmail;
          } else if (isCard) {
            paymentData.cardNumber = cardNumber;
            paymentData.expirationDate = expirationDate;
            paymentData.cvv = cvv;
          }
  
          const timestamp = new Date().toISOString(); // Generate current timestamp
  
          await addDoc(collection(db, 'Bestellungen'), {
            name,
            email,
            address,
            phone,
            payment,
            cartItems: cart,
            totalPrice: getTotalPrice(),
            timestamp, // Add the timestamp here
            ...paymentData,
          });
          
          setShowDeliveryModal(false);
          setCart({});
          alert('Delivery order placed successfully!');
        } catch (error) {
          console.error('Error placing delivery order:', error);
          alert('Error placing delivery order. Please try again.');
        }
      } else {
        alert('Please fill in all required fields for the selected payment method.');
      }
    } else {
      alert('Please fill in all required fields.');
    }
  };
  const handleCategoryChange = (event) => {
    const nullArray = document.getElementById('packer');
    if(event.target.value===nullArray.innerHTML){
      setSelectedCategory(null);
    }else{
      setSelectedCategory(event.target.value);
    }
  };

  const closeModal = () => {
    setShowPickupModal(false);
    setShowDeliveryModal(false);
  };
  return (
    <div className="App">
      <header className="App-header">
        {logoUrl ? (
          <img className="logo" src={logoUrl} alt="Logo" />
        ) : (
          <p>Loading logo...</p>
        )}
        <h1 className='pageTitle' id='StoreName' translate='no'>{storeInfo ? storeInfo.Name : 'Loading store information...'}</h1>
        <nav>
          <ul>
            <li translate='no'><a href="#Home">Home</a></li>
            <li translate='no'><a href="#menu">Menu</a></li>
            <li translate='no'><a href="#news">News</a></li>
            <li translate='no'><a href="#contact">Contact</a></li>
          </ul>
          <div className='status' translate='yes'>
            {status}
          </div>
           {/* Floating Cart Icon */}
        <div className="floating-cart" onClick={() => setShowCartModal(true)}>
          <img src={require('./basket.png')} alt="Cart" />
          <span>{Object.values(cart).reduce((total, item) => total + item.quantity, 0)}</span>
        </div>

        {/* Cart Modal */}
        {showCartModal && (
          <div className="modal">
            <div className="modal-content">
              <span className="close" onClick={() => setShowCartModal(false)}>&times;</span>
              <h2 className="modal-title">Cart</h2>
              {Object.keys(cart).length ? (
                <ul>
                  {Object.values(cart).map(cartItem => (
                    <li key={cartItem.id} className='items'>
                      <span translate='yes'>{cartItem.name} x{cartItem.quantity}</span>
                      <span translate='yes'>Price: €{(cartItem.quantity * parseFloat(cartItem.price.replace('€', '').replace(',', '.'))).toFixed(2)} </span>
                      <button onClick={() => removeFromCart(cartItem.name)} translate='yes'>Remove</button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Cart is empty</p>
              )}
              <h3 className='total' translate='yes'>Total Price: €{getTotalPrice()}</h3>
              <button onClick={() => setShowPickupModal(true)} translate='yes' className='pickUp'>Pickup</button>
              <button onClick={() => setShowDeliveryModal(true)} translate='yes' className='delivery'>Delivery</button>
            </div>
          </div>
        )}

        {/* Pickup Modal */}
        {showPickupModal && (
          <div className="modal">
            <div className="modal-content">
              <span className="close" onClick={closeModal}>&times;</span>
              <h2>Pickup Details</h2>
              <form>
                <label>
                  Name:
                  <input type="text" value={pickupDetails.name} onChange={e => setPickupDetails({ ...pickupDetails, name: e.target.value })} />
                </label>
                <label>
                  Phone:
                  <input type="text" value={pickupDetails.phone} onChange={e => setPickupDetails({ ...pickupDetails, phone: e.target.value })} />
                </label>
                <button type="button" onClick={handlePickup} className='order'>Place Pickup Order</button>
              </form>
            </div>
          </div>
        )}

        {/* Delivery Modal */}
        {showDeliveryModal && (
          <div className="modal">
            <div className="modal-content">
              <span className="close" onClick={closeModal}>&times;</span>
              <h2>Delivery Details</h2>
              <form>
        <label>
          Name:
          <input type="text" value={deliveryDetails.name} onChange={e => setDeliveryDetails({ ...deliveryDetails, name: e.target.value })} />
        </label>
        <label>
          Email:
          <input type="email" value={deliveryDetails.email} onChange={e => setDeliveryDetails({ ...deliveryDetails, email: e.target.value })} />
        </label>
        <label>
          Address:
          <input type="text" value={deliveryDetails.address} onChange={e => setDeliveryDetails({ ...deliveryDetails, address: e.target.value })} />
        </label>
        <label>
          Phone:
          <input type="text" value={deliveryDetails.phone} onChange={e => setDeliveryDetails({ ...deliveryDetails, phone: e.target.value })} />
        </label>
        <label>
          Payment Method:
          <select value={deliveryDetails.payment} onChange={e => setDeliveryDetails({ ...deliveryDetails, payment: e.target.value })} style={{height:50, fontSize: 13,width:70}}>
            <option value="Paypal">PayPal</option>
            <option value="Card">Card</option>
            <option value="Cash">Cash (no infos Required)</option>
          </select>
        </label>
        {deliveryDetails.payment === 'Paypal' && (
          <div style={{width:'100%',background: 'pink',display:'block'}}>
            <label id='paypal'>
              PayPal Email:
              <input type="email" value={deliveryDetails.paypalEmail} onChange={e => setDeliveryDetails({ ...deliveryDetails, paypalEmail: e.target.value })} style={{width: '70%',marginTop: -30}}/>
            </label>
          </div>
        )}
        {deliveryDetails.payment === 'Card' && (
          <div style={{width:'100%',background: 'pink',fontSize:'30px'}}>
            <label style={{backgroundColor:'transparent'}}>
              IBAN:
              <input type="text" value={deliveryDetails.cardNumber} onChange={e => setDeliveryDetails({ ...deliveryDetails, cardNumber: e.target.value })} />
            </label>
            <label style={{backgroundColor:'transparent',width:20}}>
              Expiration Date:
              <input type="text" value={deliveryDetails.expirationDate} onChange={e => setDeliveryDetails({ ...deliveryDetails, expirationDate: e.target.value })} />
            </label>
            <label style={{backgroundColor:'transparent'}}>
              CVV:
              <input type="text" value={deliveryDetails.cvv} onChange={e => setDeliveryDetails({ ...deliveryDetails, cvv: e.target.value })} />
            </label>
          </div>
        )}
        <button type="button" onClick={handleDelivery} className='order'>Place Delivery Order</button>
      </form>
            </div>
          </div>
        )}
        </nav>
      </header>

      <main>
        <section id='Home' className='store_Informations greeting'>
          <span className='storeData'>
            {logoUrl ? (
              <>
                <img className="logo2" src={logoUrl} alt="Logo" />
                <div className='Address'>{storeInfo?.Addres}</div>
              </>
            ) : (
              <p>Loading logo...</p>
            )}
            <div className='storeText' translate='yes'>
              <b translate='yes'> Über Unser Geschäft</b><br></br>

              Willkommen bei <strong>{storeInfo?.Name}</strong>! Wir sind stolz darauf, Ihnen eine Vielzahl an köstlichen Gerichten direkt an Ihre Haustür zu liefern. Unser Geschäft wurde mit der Vision gegründet, qualitativ hochwertige Mahlzeiten schnell und bequem zu Ihnen nach Hause zu bringen.<br></br>

              <b translate='yes'>Unsere Speisekarte</b><br></br>

              Unsere Speisekarte umfasst eine breite Auswahl an Gerichten, die alle mit Liebe und Sorgfalt zubereitet werden. Von traditionellen lokalen Spezialitäten bis hin zu internationalen Köstlichkeiten – bei uns ist für jeden etwas dabei. Wir verwenden nur frische und hochwertige Zutaten, um sicherzustellen, dass jedes Gericht nicht nur lecker, sondern auch nahrhaft ist.
            </div>
          </span>
          <div className='Location'></div>
          <h2 translate='yes'>Service Hours</h2>
          {Object.keys(service).length ? (
            <ul>
              {Object.keys(service).map(day => (
                <li key={day}>
                  <strong>{day}</strong>: {service[day]}
                </li>
              ))}
            </ul>
          ) : (
            <p>Loading service hours...</p>
          )}
          <div className='map-container'>
            <MapContainer center={location} zoom={13} className="map">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={location}>
                <Popup>{storeInfo?.Name}</Popup>
              </Marker>
            </MapContainer>
          </div>
        </section>
        <section id="menu" className="menu_Container producs">
      <h2 translate="yes">Menu</h2>
      {loadingMenu ? (
        <p className="loading" translate="yes">
          Loading Menu...
        </p>
      ) : (
        <>
        <select value={selectedCategory} onChange={handleCategoryChange} class='category'>
          <option value={null} translate="yes" id='packer'>Küche</option>
          {Object.keys(menu).map((category) => (
            <option key={category} value={category} className='option'>
              {category}
            </option>
          ))}
        </select>
        {selectedCategory===null ? (
          <div className="default-image">
            {/* Image to display when no category is selected */}
            <h5>Unsere Küche</h5>
            <p className='kitchen'>
              Unsere Küche ist bekannt für ihre herausragende Qualität und kulinarische Exzellenz. 
              Mit den besten Köchen an unserer Seite bieten wir Ihnen eine Vielzahl von Gerichten, 
              die mit Liebe und Präzision zubereitet werden. Unsere erstklassigen Köche verwenden 
              nur die frischesten Zutaten und kreieren köstliche Speisen mit einer Vielfalt an 
              Belägen und Geschmackskombinationen, die selbst die anspruchsvollsten Gaumen 
              zufriedenstellen. Lassen Sie sich von unserer Küche verwöhnen und erleben Sie 
              ein gastronomisches Erlebnis der Extraklasse.
            </p>
          </div>
        ) : (
          <div className="produkte">
            <div className="menu-items">
              {menu[selectedCategory].map((item) => (
                <div key={item.name} className="menu-item">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="menu-item-image"
                  />
                  <span className="product-infos">
                    <h4>{item.name}</h4>
                    <p>{item.ingredients?.filter(Boolean).join(', ')}</p>
                  </span>
                  <p className="prices money">{item.price}</p>
                  <button
                    className="reducer"
                    onClick={() => removeFromCart(item.name)}
                  >
                    -
                  </button>
                  <p className="amount">{cart[item.name]?.quantity || 0}</p>
                  <button className="adder" onClick={() => addToCart(item)}>
                    +
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
      )}
    </section>
    <section id='news' className='newsContainer'>
  <div className="news-items">
    <div className="container">
      <h1>Latest News</h1>
      <div className="news-items">
      {Array.isArray(news) && news.map((item, index) => (
  <div key={index} className="news-item">
    <h2>{item.title}</h2>
    {item.imageUrl && <img src={item.imageUrl} alt={item.title} />}
    <p>{item.Description}</p>
    <button>Download</button>
  </div>
))}
</div>
    </div>
  </div>
    </section>
    {/* Contact Section */}
    <section id="contact" className='contact-Container'>
  <h2>Contact Us</h2>
  {storeInfo ? (
    <div className="contact-info">
      <h3>Store Information</h3>
      <ul>
        <li>
          <strong>Name:</strong> {storeInfo['Name']}
        </li>
        <li>
          <strong>Address:</strong> {storeInfo['Addres']}
        </li>
        <li>
        <strong>Tel:</strong> <a href={`tel:${storeInfo['phone']}`} className="phoni">{storeInfo['phone']}</a>
        </li>
        <li>
          <strong>Email:</strong>  <a href={`mailto:${storeInfo['E-Mail']}`} className='mailing'>{storeInfo['E-Mail']}</a>
        </li>
      </ul>
    </div>
  ) : (
    <p>Loading contact information...</p>
  )}
</section>
      </main>
    </div>
  );
}

export default App;