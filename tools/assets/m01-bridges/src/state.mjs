// Render/collision adapter. Events come from mission state; no clock or detonation logic.
export function applyBridgeState(root, consumedEventIds = []) {
  const consumed = new Set(consumedEventIds);
  const result = { hidden: [], destroyed: [], activeColliders: [] };
  root.traverse(object => {
    const part = object.userData?.m01;
    if (!part) return;
    if (part.collider) {
      object.visible = false;
      object.userData.colliderEnabled = !part.destroyedBy || !consumed.has(part.destroyedBy);
      if (object.userData.colliderEnabled) result.activeColliders.push(part.logicalId ?? object.name);
    } else if (part.showAfterEvent) {
      object.visible = consumed.has(part.showAfterEvent);
      if (object.visible) result.destroyed.push(part.logicalId ?? object.name);
    } else if (part.state === 'destroyed') {
      // Fail closed if a damaged part lacks its explicit event reference.
      object.visible = false;
    } else if (part.destroyedBy) {
      object.visible = !consumed.has(part.destroyedBy);
      if (!object.visible) result.hidden.push(part.logicalId ?? object.name);
    }
  });
  return result;
}
