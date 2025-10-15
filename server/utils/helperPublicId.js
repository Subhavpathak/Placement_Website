// Helper: extract Cloudinary public_id and resource_type from a URL
function getCloudinaryId(fileUrl) {
    try {
        if (!/^https?:\/\//i.test(fileUrl)) return { publicId: null, resourceType: null };
        const u = new URL(fileUrl);
        const parts = u.pathname.split('/').filter(Boolean); 
        // e.g. ['mycloud','raw','upload','v123','placement','resumes','file.pdf']

        // Find delivery type in path
        const deliveryIdx = parts.findIndex(p => ['upload', 'private', 'authenticated', 'fetch'].includes(p));
        if (deliveryIdx === -1) return { publicId: null, resourceType: null };

        // Resource type is the segment before delivery type
        const resourceType = parts[deliveryIdx - 1] || null;

        // Start after delivery segment, skip transforms until version if present
        let idx = deliveryIdx + 1;
        while (idx < parts.length && !/^v\d+$/.test(parts[idx])) idx++;
        if (idx < parts.length && /^v\d+$/.test(parts[idx])) idx++; // skip version

        // Remainder is folder/public_id with extension
        const withExt = parts.slice(idx).join('/');
        if (!withExt) return { publicId: null, resourceType };

        const decoded = decodeURIComponent(withExt);
        const dot = decoded.lastIndexOf('.');
        const publicId = dot >= 0 ? decoded.slice(0, dot) : decoded;

        return { publicId, resourceType };
    } catch {
        return { publicId: null, resourceType: null };
    }
}

module.exports = { getCloudinaryId };