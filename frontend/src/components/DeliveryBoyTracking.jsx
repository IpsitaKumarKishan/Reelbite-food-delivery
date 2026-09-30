import React, { useEffect } from 'react'
import scooter from "../assets/scooter.png"
import home from "../assets/home.png"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'

const deliveryBoyIcon = new L.Icon({
    iconUrl: scooter,
    iconSize: [40, 40],
    iconAnchor: [20, 40]
})
const customerIcon = new L.Icon({
    iconUrl: home,
    iconSize: [40, 40],
    iconAnchor: [20, 40]
})

function RecenterMap({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center && !isNaN(center[0]) && !isNaN(center[1]) && center[0] !== 0) {
            map.panTo(center, { animate: true });
        }
    }, [center, map]);
    return null;
}

function DeliveryBoyTracking({ data }) {
    const deliveryBoyLat = Number(data?.deliveryBoyLocation?.lat) || 0;
    const deliveryBoylon = Number(data?.deliveryBoyLocation?.lon) || 0;
    const customerLat = Number(data?.customerLocation?.lat) || 0;
    const customerlon = Number(data?.customerLocation?.lon) || 0;

    const hasDriverCoords = deliveryBoyLat !== 0 && deliveryBoylon !== 0;
    const hasCustomerCoords = customerLat !== 0 && customerlon !== 0;

    const center = hasDriverCoords 
        ? [deliveryBoyLat, deliveryBoylon] 
        : (hasCustomerCoords ? [customerLat, customerlon] : [20.5937, 78.9629]);

    const path = (hasDriverCoords && hasCustomerCoords)
        ? [
            [deliveryBoyLat, deliveryBoylon],
            [customerLat, customerlon]
          ]
        : [];

    return (
        <div className='w-full h-[400px] mt-3 rounded-xl overflow-hidden shadow-md'>
            <MapContainer
                className={"w-full h-full"}
                center={center}
                zoom={15}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <RecenterMap center={center} />

                {hasDriverCoords && (
                    <Marker position={[deliveryBoyLat, deliveryBoylon]} icon={deliveryBoyIcon}>
                        <Popup>Delivery Partner (Live)</Popup>
                    </Marker>
                )}

                {hasCustomerCoords && (
                    <Marker position={[customerLat, customerlon]} icon={customerIcon}>
                        <Popup>Customer Delivery Location</Popup>
                    </Marker>
                )}

                {path.length > 0 && (
                    <Polyline positions={path} color='#ff5200' weight={4} dashArray="6, 8" />
                )}
            </MapContainer>
        </div>
    )
}

export default DeliveryBoyTracking
