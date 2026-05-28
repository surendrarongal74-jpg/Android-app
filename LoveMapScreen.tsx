/// <reference types="vite/client" />
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { useCoupleSpace } from '../contexts/CoupleSpaceContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { BottomNav } from '../components/BottomNav';
import { MapPin, Plus, Navigation, Image as ImageIcon, X, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 40.7128,
  lng: -74.0060
};

// Subtle romantic map styles to fit our mood
const mapStyles = [
  {
    "featureType": "all",
    "elementType": "geometry.fill",
    "stylers": [{"weight": "2.00"}]
  },
  {
    "featureType": "all",
    "elementType": "geometry.stroke",
    "stylers": [{"color": "#9c9c9c"}]
  },
  {
    "featureType": "all",
    "elementType": "labels.text",
    "stylers": [{"visibility": "on"}]
  },
  {
    "featureType": "landscape",
    "elementType": "all",
    "stylers": [{"color": "#f2f2f2"}]
  },
  {
    "featureType": "landscape",
    "elementType": "geometry.fill",
    "stylers": [{"color": "#ffffff"}]
  },
  {
    "featureType": "landscape.man_made",
    "elementType": "geometry.fill",
    "stylers": [{"color": "#ffffff"}]
  },
  {
    "featureType": "poi",
    "elementType": "all",
    "stylers": [{"visibility": "off"}]
  },
  {
    "featureType": "road",
    "elementType": "all",
    "stylers": [{"saturation": -100}, {"lightness": 45}]
  },
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [{"color": "#eeeeee"}]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#7b7b7b"}]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.stroke",
    "stylers": [{"color": "#ffffff"}]
  },
  {
    "featureType": "road.highway",
    "elementType": "all",
    "stylers": [{"visibility": "simplified"}]
  },
  {
    "featureType": "road.arterial",
    "elementType": "labels.icon",
    "stylers": [{"visibility": "off"}]
  },
  {
    "featureType": "transit",
    "elementType": "all",
    "stylers": [{"visibility": "off"}]
  },
  {
    "featureType": "water",
    "elementType": "all",
    "stylers": [{"color": "#e9ecef"}, {"visibility": "on"}]
  },
  {
    "featureType": "water",
    "elementType": "geometry.fill",
    "stylers": [{"color": "#fbeef0"}]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#070707"}]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.stroke",
    "stylers": [{"color": "#ffffff"}]
  }
];

export function LoveMapScreen() {
  const navigate = useNavigate();
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey
  });

  const { space } = useCoupleSpace();
  const { userData } = useAuth();
  
  const [markers, setMarkers] = useState<any[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<any>(null);
  
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [center, setCenter] = useState(defaultCenter);
  
  const [liveLocations, setLiveLocations] = useState<any[]>([]);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  
  const [addingLocation, setAddingLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newType, setNewType] = useState('first_meet');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  const onMapLoad = useCallback(function callback(map: google.maps.Map) {
    setMap(map);
  }, []);

  const onMapUnmount = useCallback(function callback(map: google.maps.Map) {
    setMap(null);
  }, []);

  useEffect(() => {
    if (!space?.id) return;

    const q = query(
      collection(db, `coupleSpaces/${space.id}/memories`),
      where('type', '==', 'map_marker')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const markersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMarkers(markersData);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `coupleSpaces/${space.id}/memories`);
    });

    const liveLocationsQ = query(collection(db, `coupleSpaces/${space.id}/liveLocations`));
    const unsubscribeLiveLocations = onSnapshot(liveLocationsQ, (snapshot) => {
      const locs = snapshot.docs.map(doc => doc.data());
      setLiveLocations(locs.filter(l => l.sharingEnabled && Date.now() - l.updatedAt < 1000 * 60 * 60 * 24)); // Only show locations updated in the last 24h
      
      const myLoc = locs.find(l => l.userId === userData?.id);
      if (myLoc) {
        setIsSharingLocation(myLoc.sharingEnabled);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `coupleSpaces/${space.id}/liveLocations`);
    });

    return () => {
      unsubscribe();
      unsubscribeLiveLocations();
    };
  }, [space?.id, userData?.id]);

  useEffect(() => {
    let watchId: number;
    
    if (isSharingLocation && space?.id && userData?.id) {
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition((position) => {
           const lat = position.coords.latitude;
           const lng = position.coords.longitude;
           
           setDoc(doc(db, `coupleSpaces/${space.id}/liveLocations`, userData.id), {
             userId: userData.id,
             coupleSpaceId: space.id,
             lat,
             lng,
             updatedAt: Date.now(),
             sharingEnabled: true
           }, { merge: true }).catch(err => {
             console.error("Failed to update live location", err);
           });
        }, (err) => {
          console.error("Location watch error", err);
        }, {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 10000
        });
      }
    }
    
    return () => {
      if (watchId !== undefined && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isSharingLocation, space?.id, userData?.id]);

  useEffect(() => {
    if (navigator.geolocation && markers.length === 0) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => null
      );
    } else if (markers.length > 0) {
      // Center on most recent marker if needed, or stick to default center. Let's not keep moving the map around too much automatically.
    }
  }, [markers.length]);

  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setAddingLocation({
        lat: e.latLng.lat(),
        lng: e.latLng.lng()
      });
      setSelectedMarker(null);
    }
  }, []);

  const handleAddMarker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!space?.id || !userData?.id || !addingLocation || !newTitle) return;

    const markerId = `marker_${Date.now()}`;
    const markerData = {
      id: markerId,
      coupleSpaceId: space.id,
      creatorId: userData.id,
      type: 'map_marker',
      markerType: newType,
      title: newTitle,
      content: newNotes,
      lat: addingLocation.lat,
      lng: addingLocation.lng,
      url: newPhotoUrl,
      date: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, `coupleSpaces/${space.id}/memories`, markerId), markerData);
      setAddingLocation(null);
      setNewTitle('');
      setNewNotes('');
      setNewType('first_meet');
      setNewPhotoUrl('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `coupleSpaces/${space.id}/memories`);
    }
  };

  const getMarkerEmoji = (type: string) => {
    switch (type) {
      case 'first_meet': return '❤️';
      case 'trip': return '✈️';
      case 'date': return '🥂';
      case 'home': return '🏡';
      default: return '📍';
    }
  };

  const toggleLocationSharing = async () => {
    if (!space?.id || !userData?.id) return;
    
    const newSharingState = !isSharingLocation;
    setIsSharingLocation(newSharingState);
    
    try {
       await setDoc(doc(db, `coupleSpaces/${space.id}/liveLocations`, userData.id), {
          userId: userData.id,
          coupleSpaceId: space.id,
          lat: center.lat, // fallback, the watchPosition effect will override this immediately if true
          lng: center.lng,
          updatedAt: Date.now(),
          sharingEnabled: newSharingState
       }, { merge: true });
    } catch (err) {
       console.error("Failed to toggle sharing", err);
       setIsSharingLocation(!newSharingState); // Revert on failure
       handleFirestoreError(err, OperationType.UPDATE, `coupleSpaces/${space.id}/liveLocations`);
    }
  };

  if (!apiKey) {
    return (
      <div className="flex flex-col h-screen bg-rose-50 relative pb-20">
        <div className="absolute top-0 left-0 right-0 z-10 px-6 py-8 pb-4 bg-gradient-to-b from-white/80 to-transparent pointer-events-none">
          <h1 className="text-3xl font-serif font-bold text-rose-950 flex items-center gap-2 pointer-events-auto shadow-sm tracking-tight drop-shadow-md">
            Love Map <MapPin className="w-6 h-6 text-rose-500" />
          </h1>
          <p className="text-sm text-rose-600 font-medium mt-1 pointer-events-auto bg-white/50 inline-block px-2 py-0.5 rounded-full filter backdrop-blur-md">
            Mark our special places
          </p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10 pt-24">
          <div className="bg-white/90 backdrop-blur-md border border-rose-100 p-8 rounded-3xl shadow-xl max-w-sm">
            <h2 className="text-xl font-bold text-rose-950 mb-4">Google Maps Setup Required</h2>
            <p className="text-rose-600 mb-4 text-sm">To use the Love Map feature, you need to provide a Google Maps API Key.</p>
            <ol className="text-left text-sm text-rose-700 space-y-2 mb-6 list-decimal pl-4">
              <li>Open the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="font-bold underline text-rose-500">Google Cloud Console</a>.</li>
              <li>Create a project and enable the <b>Maps JavaScript API</b>.</li>
              <li>Generate an API Key.</li>
              <li>Open the AI Studio Settings menu (top right) and set the <b>VITE_GOOGLE_MAPS_API_KEY</b> secret.</li>
            </ol>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (loadError) {
    return <div className="h-screen flex items-center justify-center p-6 text-center text-rose-500 font-medium bg-rose-50 flex-col">
      <h2 className="text-xl font-bold mb-2">Failed to load Google Maps</h2>
      <p>Please check your VITE_GOOGLE_MAPS_API_KEY API key and ensure the Maps JavaScript API is enabled in Google Cloud Console.</p>
      <BottomNav />
    </div>;
  }

  return (
    <div className="flex flex-col h-screen bg-rose-50 relative">
      <div className="absolute top-0 left-0 right-0 z-10 px-6 py-8 pb-4 bg-gradient-to-b from-white/80 to-transparent pointer-events-none flex justify-between items-start">
        <div className="flex gap-3 items-start pointer-events-auto">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 bg-white/90 rounded-full shadow-md text-rose-500 hover:bg-rose-50 transition-colors border border-rose-100 flex-shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-serif font-bold text-rose-950 flex items-center gap-2 shadow-sm tracking-tight drop-shadow-md">
              Love Map <MapPin className="w-6 h-6 text-rose-500" />
            </h1>
            <p className="text-sm text-rose-600 font-medium mt-1 bg-white/50 inline-block px-2 py-0.5 rounded-full filter backdrop-blur-md">
              Mark our special places
            </p>
          </div>
        </div>
        <button
          onClick={toggleLocationSharing}
          className={`pointer-events-auto px-3 py-2 rounded-xl flex flex-col items-center justify-center transition-all shadow-md backdrop-blur-md ${isSharingLocation ? 'bg-rose-500 text-white' : 'bg-white/80 text-gray-500'}`}
        >
          <Navigation className={`w-5 h-5 mb-1 ${isSharingLocation ? 'animate-pulse' : ''}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider">{isSharingLocation ? 'Live' : 'Share'}</span>
        </button>
      </div>

      <div className="flex-1 w-full relative">
        {!isLoaded ? (
          <div className="w-full h-full flex items-center justify-center bg-rose-100/50">
            <div className="animate-pulse flex flex-col items-center">
              <MapPin className="w-8 h-8 text-rose-300 mb-2" />
              <p className="text-rose-400 font-medium">Loading Map...</p>
            </div>
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={4}
            onLoad={onMapLoad}
            onUnmount={onMapUnmount}
            onClick={onMapClick}
            options={{
              disableDefaultUI: true,
              zoomControl: true,
              styles: mapStyles
            }}
          >
            {markers.map((marker) => (
              <Marker
                key={marker.id}
                position={{ lat: marker.lat, lng: marker.lng }}
                onClick={() => {
                  setSelectedMarker(marker);
                  setAddingLocation(null);
                }}
                label={{
                  text: getMarkerEmoji(marker.markerType),
                  fontSize: '24px'
                }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 0, 
                }}
              />
            ))}

            {liveLocations.map((loc) => {
              const isPartner = loc.userId !== userData?.id;
              return (
                <Marker
                  key={`live_${loc.userId}`}
                  position={{ lat: loc.lat, lng: loc.lng }}
                  label={{
                    text: isPartner ? '💖' : '👤',
                    fontSize: '24px',
                    className: 'live-marker'
                  }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 1, 
                    fillColor: isPartner ? '#f43f5e' : '#3b82f6',
                    fillOpacity: 0.5,
                    strokeWeight: 0,
                  }}
                  title={isPartner ? "Partner's Live Location" : "My Live Location"}
                />
              );
            })}

            {selectedMarker && (
              <InfoWindow
                position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
                onCloseClick={() => setSelectedMarker(null)}
                options={{ pixelOffset: new google.maps.Size(0, -10) }}
              >
                <div className="p-1 max-w-[200px]">
                  <h3 className="font-bold text-rose-950 text-base mb-1 flex items-center gap-1">
                    {getMarkerEmoji(selectedMarker.markerType)} {selectedMarker.title}
                  </h3>
                  {selectedMarker.url && (
                    <div className="w-full h-24 mb-2 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                      <img src={selectedMarker.url} alt="Location" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {selectedMarker.content && (
                    <p className="text-sm text-gray-700 italic border-l-2 border-rose-300 pl-2">
                       "{selectedMarker.content}"
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-2">
                    {new Date(selectedMarker.date).toLocaleDateString()}
                  </p>
                </div>
              </InfoWindow>
            )}

            {addingLocation && (
              <InfoWindow
                position={addingLocation}
                onCloseClick={() => setAddingLocation(null)}
              >
                 <div className="w-[200px]">
                   <p className="text-xs font-bold text-rose-500 mb-2">New Marker at this location</p>
                   <p className="text-[10px] text-gray-500 mb-2">Fill the form below</p>
                 </div>
              </InfoWindow>
            )}
          </GoogleMap>
        )}

      </div>

      {/* Add Marker Form Modal (Slide up) */}
      <AnimatePresence>
        {addingLocation && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-[80px] left-0 right-0 z-20 px-4"
          >
            <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] p-6 shadow-2xl border border-rose-100 relative">
               <button 
                  onClick={() => setAddingLocation(null)}
                  className="absolute top-4 right-4 p-2 bg-gray-100 text-gray-400 rounded-full hover:bg-gray-200 transition-colors"
               >
                 <X className="w-4 h-4" />
               </button>
               
               <h3 className="text-lg font-serif font-bold text-rose-950 mb-4">Add special place</h3>
               
               <form onSubmit={handleAddMarker} className="space-y-4">
                  <div>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {[ 
                        { id: 'first_meet', label: 'First Meet', emoji: '❤️' },
                        { id: 'trip', label: 'Trip', emoji: '✈️' },
                        { id: 'date', label: 'Date', emoji: '🥂' },
                        { id: 'home', label: 'Home', emoji: '🏡' },
                      ].map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setNewType(t.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1 transition-all ${newType === t.id ? 'bg-rose-500 text-white shadow-md' : 'bg-rose-50 text-rose-500 hover:bg-rose-100'}`}
                        >
                          <span>{t.emoji}</span> {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <input
                    type="text"
                    required
                    placeholder="Location Name"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-white border border-rose-200 rounded-xl px-4 py-3 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all text-rose-950 font-medium placeholder:font-normal"
                  />
                  
                  <textarea
                    placeholder="A memory about this place..."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full bg-white border border-rose-200 rounded-xl px-4 py-3 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all text-sm text-gray-700 resize-none h-20"
                  />

                  <div className="relative">
                    <input
                      type="url"
                      placeholder="Photo URL (Optional)"
                      value={newPhotoUrl}
                      onChange={(e) => setNewPhotoUrl(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-rose-300 transition-all text-xs"
                    />
                    <ImageIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  </div>

                  <button 
                    type="submit"
                    disabled={!newTitle.trim()}
                    className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl py-3 font-bold flex justify-center items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Save Place <MapPin className="w-4 h-4" />
                  </button>
               </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
