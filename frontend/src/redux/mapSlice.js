import { createSlice } from "@reduxjs/toolkit";

const mapSlice = createSlice({
    name: "map",
    initialState: {
        location: {
            lat: 20.5937,
            lon: 78.9629
        },
        address: ""
    },
    reducers: {
        setLocation: (state, action) => {
            const { lat, lon } = action.payload || {};
            if (lat !== null && lat !== undefined && !isNaN(lat)) {
                state.location.lat = Number(lat);
            }
            if (lon !== null && lon !== undefined && !isNaN(lon)) {
                state.location.lon = Number(lon);
            }
        },
        setAddress: (state, action) => {
            state.address = action.payload;
        }
    }
});

export const { setAddress, setLocation } = mapSlice.actions;
export default mapSlice.reducer;
