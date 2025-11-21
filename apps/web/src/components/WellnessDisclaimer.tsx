/**
 * Wellness Disclaimer Component
 * Displays "do no harm" policy and medical disclaimer
 */

export function WellnessDisclaimer() {
  return (
    <div className="p-4 rounded-xl bg-bluewell-light/10 border border-bluewell-light/20">
      <p className="text-xs text-neutral-text leading-relaxed">
        <strong className="text-neutral-dark">Wellness Note:</strong> BlueWell provides suggestions and 
        recommendations for informational purposes only. This is not medical advice. Please consult with a 
        healthcare provider before making significant changes to your diet or exercise routine. Individual 
        results may vary. BlueWell respects your dietary restrictions and allergies—please ensure all 
        recommendations align with your health needs.
      </p>
    </div>
  );
}

