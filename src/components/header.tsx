import type { FC } from 'react';
import { FileText } from 'lucide-react';

const Header: FC = () => {
  return (
    <header className="py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-0 flex items-center">
        <FileText className="h-10 w-10 text-primary" />
        <h1 className="ml-3 text-4xl font-headline font-bold text-primary">
          QuickBill
        </h1>
      </div>
    </header>
  );
};

export default Header;
