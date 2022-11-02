export class FlatDoc {
  static makeFlat(doc, stopper) {
    const flatDoc = {};
    stopper = (typeof stopper === 'function') ? stopper : () => false;
    FlatDoc.flat(flatDoc, '', doc, stopper);
    return flatDoc;
  }

  static flat(flatDoc, flatKey, doc, stopper) {
    Object.entries(doc).forEach(([key, value]) => {
      const updatedFlatKey = FlatDoc.updateFlatKey(flatKey, key);
      if (stopper(doc, key)) {
        FlatDoc.appendFlatKey(flatDoc, flatKey, {[key]: value});
      } else if (FlatDoc.canDeeper(value)) {
        FlatDoc.flat(flatDoc, updatedFlatKey, value, stopper);
      } else {
        FlatDoc.appendFlatKey(flatDoc, updatedFlatKey, value);
      }
    });
  }

  static canDeeper(value) {
    return !!(value && typeof value === 'object' && Object.keys(value).length && !Array.isArray(value));
  }

  static updateFlatKey(flatKey, key) {
    return flatKey ? `${flatKey}.${key}` : `${key}`;
  }

  static appendFlatKey(flatDoc, flatKey, value) {
    flatDoc[flatKey] = value;
  }
}

