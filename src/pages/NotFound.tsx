import { Link } from 'react-router-dom';
import { Icon } from '@/components/Icons';

export default function NotFoundPage() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-forest-50 text-forest">
        <Icon name="compass" className="h-7 w-7" />
      </span>
      <p className="eyebrow mt-5">404</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">This path is not on the map</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
        The page you asked for does not exist. Check the address, or start again from the trail directory.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link to="/explore" className="btn-primary">
          Browse trails
        </Link>
        <Link to="/" className="btn-secondary">
          Home
        </Link>
      </div>
    </div>
  );
}
