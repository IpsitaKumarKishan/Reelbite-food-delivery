import User from "../models/user.model.js";
import DeliveryAssignment from "../models/deliveryAssignment.model.js";

export const findNearbyAvailableDeliveryBoys = async (longitude, latitude, maxDistance = 5000) => {
  const nearByDeliveryBoys = await User.find({
    role: "deliveryBoy",
    isOnline: true,
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [Number(longitude), Number(latitude)] },
        $maxDistance: Number(maxDistance)
      }
    }
  });

  const nearByIds = nearByDeliveryBoys.map((b) => b._id);
  const busyIds = await DeliveryAssignment.find({
    assignedTo: { $in: nearByIds },
    status: { $nin: ["broadcasted", "brodcasted", "completed"] }
  }).distinct("assignedTo");

  const busyIdSet = new Set(busyIds.map((id) => String(id)));
  return nearByDeliveryBoys.filter((b) => !busyIdSet.has(String(b._id)));
};
