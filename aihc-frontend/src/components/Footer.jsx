const Footer = () => {
  return (
    <footer class="mt-0 border-t border-gray-200 bg-bg-secondary/40">
      <div class="max-w-6xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-2 text-[11px] text-gray-600">
        <span>© {new Date().getFullYear()} AI Health Chains Demo Portal</span>
        <span class="text-gray-500">
          Built by DeFiSCI with Solid.js, Tailwind CSS, and a Node/Express API.
        </span>
      </div>
    </footer>
  );
};

export default Footer;
